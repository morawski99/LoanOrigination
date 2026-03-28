"""
Closing API
===========
Closing Disclosure, pre-close checklist, wire instructions, and funding status.
"""

from datetime import date as date_type
from decimal import Decimal
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.loan import Loan
from app.models.loan_estimate import (
    LoanEstimate,
    LoanEstimateFee,
    LEStatus,
    SECTION_TOLERANCE,
)
from app.models.closing import (
    ClosingDisclosure,
    ClosingDisclosureFee,
    CDStatus,
    ClosingChecklist,
    ChecklistItemStatus,
    WireInstruction,
    FundingStatus,
    FundingStatusType,
)
from app.models.user import User
from app.schemas.closing import (
    CDCreate,
    CDUpdate,
    CDIssuePayload,
    CDResponse,
    CDListItem,
    CDFeeCreate,
    ToleranceCheckResponse,
    ChecklistItemCreate,
    ChecklistItemUpdate,
    ChecklistItemResponse,
    WireInstructionUpsert,
    WireInstructionResponse,
    FundingStatusUpsert,
    FundingStatusResponse,
)
from app.services.trid_calculator import (
    calculate_monthly_pi,
    calculate_apr,
    calculate_cash_to_close,
    cd_delivery_deadline,
    check_tolerance,
)

router = APIRouter(prefix="/loans/{loan_id}/closing", tags=["Closing"])


# ── Helpers ───────────────────────────────────────────────────────────────────


async def _get_loan_or_404(loan_id: UUID, db: AsyncSession) -> Loan:
    result = await db.execute(select(Loan).where(Loan.id == str(loan_id)))
    loan = result.scalar_one_or_none()
    if loan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan not found.")
    return loan


async def _get_cd_or_404(loan_id: UUID, cd_id: UUID, db: AsyncSession) -> ClosingDisclosure:
    result = await db.execute(
        select(ClosingDisclosure).where(
            ClosingDisclosure.id == str(cd_id),
            ClosingDisclosure.loan_id == str(loan_id),
        )
    )
    cd = result.scalar_one_or_none()
    if cd is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Closing Disclosure not found.")
    return cd


def _recalculate(cd: ClosingDisclosure) -> None:
    """Recompute derived fields on the CD. Mirrors the LE recalculation."""
    # Monthly P&I
    if cd.note_rate_percent is not None and cd.loan_amount and cd.loan_term_months:
        cd.monthly_principal_interest = calculate_monthly_pi(
            cd.loan_amount, cd.note_rate_percent, cd.loan_term_months,
        )
    else:
        cd.monthly_principal_interest = None

    # Section totals
    section_sums: dict[str, Decimal] = {s: Decimal("0.00") for s in "ABCEFGH"}
    for fee in cd.fees:
        if fee.paid_by.value == "Borrower":
            section_sums[fee.respa_section.value] += fee.fee_amount

    cd.total_loan_costs = section_sums["A"] + section_sums["B"] + section_sums["C"]
    cd.total_other_costs = section_sums["E"] + section_sums["F"] + section_sums["G"] + section_sums["H"]
    lender_credits = cd.lender_credits or Decimal("0.00")
    cd.total_closing_costs = cd.total_loan_costs + cd.total_other_costs - lender_credits

    # APR
    if cd.monthly_principal_interest and cd.loan_amount:
        finance_charges = sum(
            fee.fee_amount for fee in cd.fees
            if fee.is_finance_charge
            and fee.respa_section.value in ("A", "B")
            and fee.paid_by.value == "Borrower"
        )
        cd.apr_percent = calculate_apr(
            cd.loan_amount, cd.monthly_principal_interest,
            cd.loan_term_months, Decimal(str(finance_charges)),
        )
    else:
        cd.apr_percent = None

    # Total monthly payment
    pi = cd.monthly_principal_interest or Decimal("0.00")
    mi = cd.monthly_mortgage_insurance or Decimal("0.00")
    escrow = cd.monthly_escrow_amount or Decimal("0.00")
    cd.total_monthly_payment = pi + mi + escrow

    # Cash to close
    if cd.total_closing_costs is not None:
        is_purchase = cd.purchase_price is not None
        cd.cash_to_close = calculate_cash_to_close(
            loan_amount=cd.loan_amount,
            total_closing_costs=cd.total_closing_costs,
            lender_credits=Decimal("0.00"),
            seller_credits=cd.seller_credits or Decimal("0.00"),
            deposit=cd.deposit or Decimal("0.00"),
            purchase_price=cd.purchase_price if is_purchase else None,
            is_purchase=is_purchase,
        )
        if is_purchase and cd.purchase_price:
            cd.down_payment = cd.purchase_price - cd.loan_amount


def _build_cd_fees(cd: ClosingDisclosure, fee_list: list) -> list[ClosingDisclosureFee]:
    objs = []
    for i, f in enumerate(fee_list):
        objs.append(ClosingDisclosureFee(
            closing_disclosure_id=cd.id,
            respa_section=f.respa_section,
            fee_name=f.fee_name,
            fee_amount=f.fee_amount,
            tolerance_category=SECTION_TOLERANCE[f.respa_section.value],
            paid_by=f.paid_by,
            paid_to=f.paid_to,
            is_finance_charge=f.is_finance_charge,
            sort_order=f.sort_order if f.sort_order else i,
        ))
    return objs


# ═══════════════════════════════════════════════════════════════════════════════
# Closing Disclosure CRUD
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/disclosures", response_model=List[CDListItem])
async def list_closing_disclosures(
    loan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[CDListItem]:
    await _get_loan_or_404(loan_id, db)
    result = await db.execute(
        select(ClosingDisclosure)
        .where(ClosingDisclosure.loan_id == str(loan_id))
        .order_by(ClosingDisclosure.version_number.desc())
    )
    return [CDListItem.model_validate(cd) for cd in result.scalars().all()]


@router.post("/disclosures", response_model=CDResponse, status_code=status.HTTP_201_CREATED)
async def create_closing_disclosure(
    loan_id: UUID,
    payload: CDCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CDResponse:
    """
    Create a draft Closing Disclosure. Auto-populates from the latest issued LE
    if available, using it as a starting point for terms and fees.
    """
    loan = await _get_loan_or_404(loan_id, db)

    # Find latest issued LE to use as baseline
    le_result = await db.execute(
        select(LoanEstimate).where(
            LoanEstimate.loan_id == str(loan_id),
            LoanEstimate.status == LEStatus.ISSUED,
        ).order_by(LoanEstimate.version_number.desc()).limit(1)
    )
    linked_le = le_result.scalar_one_or_none()

    # Next version number
    count_result = await db.execute(
        select(func.count()).where(ClosingDisclosure.loan_id == str(loan_id))
    )
    next_version = (count_result.scalar_one() or 0) + 1

    # Parse closing date for deadline calculation
    closing_dt = None
    deadline = None
    if payload.closing_date:
        closing_dt = date_type.fromisoformat(payload.closing_date)
        deadline = cd_delivery_deadline(closing_dt)

    disbursement_dt = None
    if payload.disbursement_date:
        disbursement_dt = date_type.fromisoformat(payload.disbursement_date)

    cd = ClosingDisclosure(
        loan_id=str(loan_id),
        version_number=next_version,
        status=CDStatus.DRAFT,
        loan_amount=loan.loan_amount,
        loan_term_months=payload.loan_term_months,
        note_rate_percent=payload.note_rate_percent or (linked_le.note_rate_percent if linked_le else loan.note_rate_percent),
        monthly_mortgage_insurance=payload.monthly_mortgage_insurance,
        monthly_escrow_amount=payload.monthly_escrow_amount,
        purchase_price=payload.purchase_price or (linked_le.purchase_price if linked_le else None),
        deposit=payload.deposit,
        seller_credits=payload.seller_credits,
        lender_credits=payload.lender_credits,
        closing_date=closing_dt,
        disbursement_date=disbursement_dt,
        cd_delivery_deadline=deadline,
        linked_le_id=str(linked_le.id) if linked_le else None,
        issued_by_id=str(current_user.id),
    )
    db.add(cd)
    await db.flush()

    # Build fees: use payload fees if provided, otherwise copy from linked LE
    if payload.fees:
        fee_objs = _build_cd_fees(cd, payload.fees)
    elif linked_le:
        fee_objs = []
        for f in linked_le.fees:
            fee_objs.append(ClosingDisclosureFee(
                closing_disclosure_id=cd.id,
                respa_section=f.respa_section,
                fee_name=f.fee_name,
                fee_amount=f.fee_amount,
                tolerance_category=f.tolerance_category,
                paid_by=f.paid_by,
                paid_to=f.paid_to,
                is_finance_charge=f.is_finance_charge,
                sort_order=f.sort_order,
            ))
    else:
        fee_objs = []

    for f in fee_objs:
        db.add(f)
    await db.flush()

    await db.refresh(cd)
    _recalculate(cd)
    await db.commit()
    await db.refresh(cd)
    return CDResponse.model_validate(cd)


@router.get("/disclosures/{cd_id}", response_model=CDResponse)
async def get_closing_disclosure(
    loan_id: UUID,
    cd_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CDResponse:
    cd = await _get_cd_or_404(loan_id, cd_id, db)
    return CDResponse.model_validate(cd)


@router.patch("/disclosures/{cd_id}", response_model=CDResponse)
async def update_closing_disclosure(
    loan_id: UUID,
    cd_id: UUID,
    payload: CDUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CDResponse:
    cd = await _get_cd_or_404(loan_id, cd_id, db)
    if cd.status != CDStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only Draft Closing Disclosures can be modified.",
        )

    update_data = payload.model_dump(exclude_none=True)

    # Handle date string → date object conversion
    for date_field in ("closing_date", "disbursement_date"):
        if date_field in update_data:
            update_data[date_field] = date_type.fromisoformat(update_data[date_field])

    # Recalculate delivery deadline if closing_date changed
    if "closing_date" in update_data:
        update_data["cd_delivery_deadline"] = cd_delivery_deadline(update_data["closing_date"])

    for field, value in update_data.items():
        setattr(cd, field, value)

    _recalculate(cd)
    await db.commit()
    await db.refresh(cd)
    return CDResponse.model_validate(cd)


@router.put("/disclosures/{cd_id}/fees", response_model=CDResponse)
async def replace_cd_fees(
    loan_id: UUID,
    cd_id: UUID,
    fees: List[CDFeeCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CDResponse:
    cd = await _get_cd_or_404(loan_id, cd_id, db)
    if cd.status != CDStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only Draft Closing Disclosures can have fees updated.",
        )

    for existing_fee in list(cd.fees):
        await db.delete(existing_fee)
    await db.flush()

    fee_objs = _build_cd_fees(cd, fees)
    for f in fee_objs:
        db.add(f)
    await db.flush()

    await db.refresh(cd)
    _recalculate(cd)
    await db.commit()
    await db.refresh(cd)
    return CDResponse.model_validate(cd)


@router.post("/disclosures/{cd_id}/issue", response_model=CDResponse)
async def issue_closing_disclosure(
    loan_id: UUID,
    cd_id: UUID,
    payload: CDIssuePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CDResponse:
    cd = await _get_cd_or_404(loan_id, cd_id, db)
    if cd.status != CDStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only Draft Closing Disclosures can be issued.",
        )

    cd.issued_date = date_type.fromisoformat(payload.issued_date)
    cd.delivery_date = (
        date_type.fromisoformat(payload.delivery_date)
        if payload.delivery_date
        else cd.issued_date  # CD is typically hand-delivered
    )
    cd.status = CDStatus.ISSUED
    cd.issued_by_id = str(current_user.id)

    await db.commit()
    await db.refresh(cd)
    return CDResponse.model_validate(cd)


@router.get("/disclosures/{cd_id}/tolerance-check", response_model=ToleranceCheckResponse)
async def get_tolerance_check(
    loan_id: UUID,
    cd_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ToleranceCheckResponse:
    """Compare CD fees against the linked LE to identify tolerance violations."""
    cd = await _get_cd_or_404(loan_id, cd_id, db)
    if not cd.linked_le_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No linked Loan Estimate to compare against.",
        )

    le_result = await db.execute(
        select(LoanEstimate).where(LoanEstimate.id == cd.linked_le_id)
    )
    le = le_result.scalar_one_or_none()
    if not le:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Linked Loan Estimate not found.",
        )

    # Build fee dicts for comparison
    le_fees: dict[str, Decimal] = {}
    tolerance_map: dict[str, str] = {}
    for f in le.fees:
        if f.paid_by.value == "Borrower":
            le_fees[f.fee_name] = f.fee_amount
            tolerance_map[f.fee_name] = f.tolerance_category.value

    cd_fees: dict[str, Decimal] = {}
    for f in cd.fees:
        if f.paid_by.value == "Borrower":
            cd_fees[f.fee_name] = f.fee_amount
            if f.fee_name not in tolerance_map:
                tolerance_map[f.fee_name] = f.tolerance_category.value

    result = check_tolerance(le_fees, cd_fees, tolerance_map)
    return ToleranceCheckResponse(**result)


# ═══════════════════════════════════════════════════════════════════════════════
# Closing Checklist
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/checklist", response_model=List[ChecklistItemResponse])
async def list_checklist(
    loan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[ClosingChecklist]:
    await _get_loan_or_404(loan_id, db)
    result = await db.execute(
        select(ClosingChecklist)
        .where(ClosingChecklist.loan_id == str(loan_id))
        .order_by(ClosingChecklist.sort_order.asc(), ClosingChecklist.created_at.asc())
    )
    return list(result.scalars().all())


@router.post("/checklist", response_model=ChecklistItemResponse, status_code=status.HTTP_201_CREATED)
async def create_checklist_item(
    loan_id: UUID,
    payload: ChecklistItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ClosingChecklist:
    await _get_loan_or_404(loan_id, db)
    item = ClosingChecklist(
        loan_id=str(loan_id),
        category=payload.category,
        status=ChecklistItemStatus.PENDING,
        description=payload.description,
        due_date=payload.due_date,
        assigned_to=payload.assigned_to,
        notes=payload.notes,
        sort_order=payload.sort_order,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/checklist/{item_id}", response_model=ChecklistItemResponse)
async def update_checklist_item(
    loan_id: UUID,
    item_id: UUID,
    payload: ChecklistItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ClosingChecklist:
    item = await db.get(ClosingChecklist, str(item_id))
    if not item or item.loan_id != str(loan_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checklist item not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/checklist/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_checklist_item(
    loan_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    item = await db.get(ClosingChecklist, str(item_id))
    if not item or item.loan_id != str(loan_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checklist item not found.")
    await db.delete(item)
    await db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# Wire Instructions (upsert)
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/wire-instructions", response_model=WireInstructionResponse)
async def get_wire_instructions(
    loan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> WireInstruction:
    await _get_loan_or_404(loan_id, db)
    result = await db.execute(
        select(WireInstruction).where(WireInstruction.loan_id == str(loan_id))
    )
    wire = result.scalar_one_or_none()
    if not wire:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wire instructions not found.")
    return wire


@router.put("/wire-instructions", response_model=WireInstructionResponse)
async def upsert_wire_instructions(
    loan_id: UUID,
    payload: WireInstructionUpsert,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> WireInstruction:
    await _get_loan_or_404(loan_id, db)
    result = await db.execute(
        select(WireInstruction).where(WireInstruction.loan_id == str(loan_id))
    )
    wire = result.scalar_one_or_none()

    if wire:
        for field, value in payload.model_dump().items():
            setattr(wire, field, value)
    else:
        wire = WireInstruction(loan_id=str(loan_id), **payload.model_dump())
        db.add(wire)

    await db.commit()
    await db.refresh(wire)
    return wire


# ═══════════════════════════════════════════════════════════════════════════════
# Funding Status (upsert)
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/funding", response_model=FundingStatusResponse)
async def get_funding_status(
    loan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> FundingStatus:
    await _get_loan_or_404(loan_id, db)
    result = await db.execute(
        select(FundingStatus).where(FundingStatus.loan_id == str(loan_id))
    )
    fs = result.scalar_one_or_none()
    if not fs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funding status not found.")
    return fs


@router.put("/funding", response_model=FundingStatusResponse)
async def upsert_funding_status(
    loan_id: UUID,
    payload: FundingStatusUpsert,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> FundingStatus:
    await _get_loan_or_404(loan_id, db)
    result = await db.execute(
        select(FundingStatus).where(FundingStatus.loan_id == str(loan_id))
    )
    fs = result.scalar_one_or_none()

    data = payload.model_dump()
    # Convert date strings to date objects
    for date_field in ("scheduled_date", "funded_date"):
        if data.get(date_field):
            data[date_field] = date_type.fromisoformat(data[date_field])

    if fs:
        for field, value in data.items():
            setattr(fs, field, value)
    else:
        fs = FundingStatus(loan_id=str(loan_id), **data)
        db.add(fs)

    await db.commit()
    await db.refresh(fs)
    return fs

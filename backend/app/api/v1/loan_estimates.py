"""
Loan Estimate (LE) API
======================
TRID-compliant Loan Estimate creation, fee management, and issuance.

Endpoints:
  GET    /loans/{loan_id}/loan-estimates            — list all LE versions
  POST   /loans/{loan_id}/loan-estimates            — create a draft LE
  GET    /loans/{loan_id}/loan-estimates/{le_id}    — get single LE with fees
  PATCH  /loans/{loan_id}/loan-estimates/{le_id}    — update terms (draft only)
  PUT    /loans/{loan_id}/loan-estimates/{le_id}/fees — replace fee schedule
  POST   /loans/{loan_id}/loan-estimates/{le_id}/issue  — issue the LE
  POST   /loans/{loan_id}/loan-estimates/{le_id}/revise — create revised LE
  GET    /loans/{loan_id}/loan-estimates/trid-status    — TRID compliance summary
"""

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.loan import Loan, LoanPurposeType
from app.models.loan_estimate import (
    LoanEstimate,
    LoanEstimateFee,
    LEStatus,
    SECTION_TOLERANCE,
)
from app.models.user import User
from app.schemas.loan_estimate import (
    LoanEstimateCreate,
    LoanEstimateUpdate,
    LoanEstimateResponse,
    LoanEstimateListItem,
    FeesReplaceRequest,
    IssueRequest,
    ReviseRequest,
    TRIDStatusResponse,
)
from app.services.trid_calculator import (
    calculate_monthly_pi,
    calculate_apr,
    calculate_cash_to_close,
    le_issuance_deadline,
    earliest_consummation_date,
    add_trid_business_days,
)

router = APIRouter(prefix="/loans/{loan_id}/loan-estimates", tags=["Loan Estimates"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_loan_or_404(loan_id: UUID, db: AsyncSession) -> Loan:
    result = await db.execute(select(Loan).where(Loan.id == str(loan_id)))
    loan = result.scalar_one_or_none()
    if loan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan not found.")
    return loan


async def _get_le_or_404(loan_id: UUID, le_id: UUID, db: AsyncSession) -> LoanEstimate:
    result = await db.execute(
        select(LoanEstimate).where(
            LoanEstimate.id == str(le_id),
            LoanEstimate.loan_id == str(loan_id),
        )
    )
    le = result.scalar_one_or_none()
    if le is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan Estimate not found.",
        )
    return le


def _recalculate(le: LoanEstimate) -> None:
    """
    Recompute all derived fields (monthly payment, APR, section totals,
    cash to close) from the LE's current fee schedule and terms.
    Mutates `le` in-place; caller is responsible for committing.
    """
    # ── Monthly P&I ──────────────────────────────────────────────────────────
    if le.note_rate_percent is not None and le.loan_amount and le.loan_term_months:
        le.monthly_principal_interest = calculate_monthly_pi(
            le.loan_amount,
            le.note_rate_percent,
            le.loan_term_months,
        )
    else:
        le.monthly_principal_interest = None

    # ── Section totals ────────────────────────────────────────────────────────
    section_sums: dict[str, Decimal] = {s: Decimal("0.00") for s in "ABCEFGH"}
    for fee in le.fees:
        if fee.paid_by.value == "Borrower":
            section_sums[fee.respa_section.value] += fee.fee_amount

    le.total_loan_costs = (
        section_sums["A"] + section_sums["B"] + section_sums["C"]
    )
    le.total_other_costs = (
        section_sums["E"] + section_sums["F"] + section_sums["G"] + section_sums["H"]
    )
    lender_credits = le.lender_credits or Decimal("0.00")
    le.total_closing_costs = le.total_loan_costs + le.total_other_costs - lender_credits

    # ── APR ──────────────────────────────────────────────────────────────────
    if le.monthly_principal_interest and le.loan_amount:
        # Finance charges = fees in sections A + B that are finance charges
        finance_charges = sum(
            fee.fee_amount
            for fee in le.fees
            if fee.is_finance_charge
            and fee.respa_section.value in ("A", "B")
            and fee.paid_by.value == "Borrower"
        )
        le.apr_percent = calculate_apr(
            le.loan_amount,
            le.monthly_principal_interest,
            le.loan_term_months,
            Decimal(str(finance_charges)),
        )
    else:
        le.apr_percent = None

    # ── Total monthly payment ─────────────────────────────────────────────────
    pi = le.monthly_principal_interest or Decimal("0.00")
    mi = le.monthly_mortgage_insurance or Decimal("0.00")
    escrow = le.monthly_escrow_amount or Decimal("0.00")
    le.total_monthly_payment = pi + mi + escrow

    # ── Cash to close ─────────────────────────────────────────────────────────
    if le.total_closing_costs is not None:
        is_purchase = le.purchase_price is not None
        # Note: lender_credits are already subtracted from total_closing_costs,
        # so pass 0 here to avoid double-subtracting.
        le.cash_to_close = calculate_cash_to_close(
            loan_amount=le.loan_amount,
            total_closing_costs=le.total_closing_costs,
            lender_credits=Decimal("0.00"),
            seller_credits=le.seller_credits or Decimal("0.00"),
            deposit=le.deposit or Decimal("0.00"),
            purchase_price=le.purchase_price if is_purchase else None,
            is_purchase=is_purchase,
        )
        if is_purchase and le.purchase_price:
            le.down_payment = le.purchase_price - le.loan_amount


def _build_fees(le: LoanEstimate, fee_list: list) -> list[LoanEstimateFee]:
    """Construct LoanEstimateFee ORM objects from schema input."""
    objs = []
    for i, f in enumerate(fee_list):
        objs.append(LoanEstimateFee(
            loan_estimate_id=le.id,
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


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

@router.get("", response_model=List[LoanEstimateListItem])
async def list_loan_estimates(
    loan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[LoanEstimateListItem]:
    """Return all Loan Estimate versions for a loan, newest first."""
    await _get_loan_or_404(loan_id, db)
    result = await db.execute(
        select(LoanEstimate)
        .where(LoanEstimate.loan_id == str(loan_id))
        .order_by(LoanEstimate.version_number.desc())
    )
    les = result.scalars().all()
    return [LoanEstimateListItem.model_validate(le) for le in les]


# ---------------------------------------------------------------------------
# TRID Status
# ---------------------------------------------------------------------------

@router.get("/trid-status", response_model=TRIDStatusResponse)
async def get_trid_status(
    loan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> TRIDStatusResponse:
    """Return TRID compliance summary for this loan."""
    loan = await _get_loan_or_404(loan_id, db)

    app_date = loan.application_received_date
    le_deadline = le_issuance_deadline(app_date) if app_date else None

    today = datetime.now(timezone.utc).date()
    days_until = None
    if le_deadline:
        days_until = (le_deadline - today).days

    # Latest issued LE
    result = await db.execute(
        select(LoanEstimate)
        .where(
            LoanEstimate.loan_id == str(loan_id),
            LoanEstimate.status == LEStatus.ISSUED,
        )
        .order_by(LoanEstimate.version_number.desc())
        .limit(1)
    )
    issued_le = result.scalar_one_or_none()

    latest_version_result = await db.execute(
        select(func.max(LoanEstimate.version_number)).where(
            LoanEstimate.loan_id == str(loan_id)
        )
    )
    latest_version = latest_version_result.scalar_one_or_none() or 0

    return TRIDStatusResponse(
        loan_id=loan_id,
        application_date=app_date,
        le_deadline=le_deadline,
        days_until_deadline=days_until,
        le_issued=issued_le is not None,
        le_issued_date=issued_le.issued_date if issued_le else None,
        earliest_closing_date=(
            earliest_consummation_date(issued_le.issued_date)
            if issued_le and issued_le.issued_date
            else None
        ),
        latest_le_version=latest_version,
        tolerance_ok=True,  # TODO: wire to tolerance check when CD is built
    )


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

@router.post("", response_model=LoanEstimateResponse, status_code=status.HTTP_201_CREATED)
async def create_loan_estimate(
    loan_id: UUID,
    payload: LoanEstimateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> LoanEstimateResponse:
    """
    Create a new draft Loan Estimate for the given loan.
    Calculates monthly payment, APR, section totals, and cash-to-close.
    """
    loan = await _get_loan_or_404(loan_id, db)

    # Determine next version number
    count_result = await db.execute(
        select(func.count()).where(LoanEstimate.loan_id == str(loan_id))
    )
    next_version = (count_result.scalar_one() or 0) + 1

    # LE deadline
    trid_deadline = (
        le_issuance_deadline(loan.application_received_date)
        if loan.application_received_date
        else None
    )

    le = LoanEstimate(
        loan_id=str(loan_id),
        version_number=next_version,
        status=LEStatus.DRAFT,
        loan_amount=loan.loan_amount,
        loan_term_months=payload.loan_term_months,
        note_rate_percent=payload.note_rate_percent or loan.note_rate_percent,
        monthly_mortgage_insurance=payload.monthly_mortgage_insurance or Decimal("0.00"),
        monthly_escrow_amount=payload.monthly_escrow_amount or Decimal("0.00"),
        purchase_price=payload.purchase_price,
        deposit=payload.deposit,
        seller_credits=payload.seller_credits,
        lender_credits=payload.lender_credits,
        trid_deadline=trid_deadline,
        issued_by_id=str(current_user.id),
    )
    db.add(le)
    await db.flush()  # get le.id

    # Add fees
    fee_objs = _build_fees(le, payload.fees)
    for f in fee_objs:
        db.add(f)
    await db.flush()

    # Refresh to load fee relationship before recalculation
    await db.refresh(le)
    _recalculate(le)

    await db.commit()
    await db.refresh(le)
    return LoanEstimateResponse.model_validate(le)


# ---------------------------------------------------------------------------
# Get
# ---------------------------------------------------------------------------

@router.get("/{le_id}", response_model=LoanEstimateResponse)
async def get_loan_estimate(
    loan_id: UUID,
    le_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> LoanEstimateResponse:
    le = await _get_le_or_404(loan_id, le_id, db)
    return LoanEstimateResponse.model_validate(le)


# ---------------------------------------------------------------------------
# Update terms (draft only)
# ---------------------------------------------------------------------------

@router.patch("/{le_id}", response_model=LoanEstimateResponse)
async def update_loan_estimate(
    loan_id: UUID,
    le_id: UUID,
    payload: LoanEstimateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> LoanEstimateResponse:
    """Update loan terms on a draft LE. Recalculates all derived fields."""
    le = await _get_le_or_404(loan_id, le_id, db)
    if le.status != LEStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only Draft Loan Estimates can be modified.",
        )

    update_data = payload.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(le, field, value)

    _recalculate(le)
    await db.commit()
    await db.refresh(le)
    return LoanEstimateResponse.model_validate(le)


# ---------------------------------------------------------------------------
# Replace fee schedule
# ---------------------------------------------------------------------------

@router.put("/{le_id}/fees", response_model=LoanEstimateResponse)
async def replace_fees(
    loan_id: UUID,
    le_id: UUID,
    payload: FeesReplaceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> LoanEstimateResponse:
    """
    Replace the entire fee schedule on a draft LE.
    All existing fees are deleted and replaced with the provided list.
    Recalculates totals after replacement.
    """
    le = await _get_le_or_404(loan_id, le_id, db)
    if le.status != LEStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only Draft Loan Estimates can have fees updated.",
        )

    # Delete existing fees
    for existing_fee in list(le.fees):
        await db.delete(existing_fee)
    await db.flush()

    # Add new fees
    fee_objs = _build_fees(le, payload.fees)
    for f in fee_objs:
        db.add(f)
    await db.flush()

    await db.refresh(le)
    _recalculate(le)
    await db.commit()
    await db.refresh(le)
    return LoanEstimateResponse.model_validate(le)


# ---------------------------------------------------------------------------
# Issue
# ---------------------------------------------------------------------------

@router.post("/{le_id}/issue", response_model=LoanEstimateResponse)
async def issue_loan_estimate(
    loan_id: UUID,
    le_id: UUID,
    payload: IssueRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> LoanEstimateResponse:
    """
    Issue a draft Loan Estimate to the borrower.
    Sets issued_date and delivery_date; transitions status to Issued.
    If delivery_date is not provided, the mailbox rule applies (+3 business days).
    """
    le = await _get_le_or_404(loan_id, le_id, db)
    if le.status != LEStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only Draft Loan Estimates can be issued.",
        )

    le.issued_date = payload.issued_date
    le.delivery_date = (
        payload.delivery_date
        if payload.delivery_date
        else add_trid_business_days(payload.issued_date, 3)  # mailbox rule
    )
    le.status = LEStatus.ISSUED
    le.issued_by_id = str(current_user.id)

    await db.commit()
    await db.refresh(le)
    return LoanEstimateResponse.model_validate(le)


# ---------------------------------------------------------------------------
# Revise (create a new LE version superseding the current issued one)
# ---------------------------------------------------------------------------

@router.post("/{le_id}/revise", response_model=LoanEstimateResponse, status_code=status.HTTP_201_CREATED)
async def revise_loan_estimate(
    loan_id: UUID,
    le_id: UUID,
    payload: ReviseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> LoanEstimateResponse:
    """
    Create a revised Loan Estimate with a valid Changed Circumstance reason.
    The prior LE is marked Superseded; a new Draft LE is created at version+1
    with the same fee schedule (modified per payload).
    """
    prior_le = await _get_le_or_404(loan_id, le_id, db)
    if prior_le.status != LEStatus.ISSUED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only Issued Loan Estimates can be revised.",
        )

    # Mark prior as superseded
    prior_le.status = LEStatus.SUPERSEDED

    # New version
    new_le = LoanEstimate(
        loan_id=str(loan_id),
        version_number=prior_le.version_number + 1,
        status=LEStatus.DRAFT,
        loan_amount=prior_le.loan_amount,
        loan_term_months=payload.loan_term_months or prior_le.loan_term_months,
        note_rate_percent=payload.note_rate_percent if payload.note_rate_percent is not None else prior_le.note_rate_percent,
        monthly_mortgage_insurance=payload.monthly_mortgage_insurance if payload.monthly_mortgage_insurance is not None else prior_le.monthly_mortgage_insurance,
        monthly_escrow_amount=payload.monthly_escrow_amount if payload.monthly_escrow_amount is not None else prior_le.monthly_escrow_amount,
        purchase_price=prior_le.purchase_price,
        deposit=prior_le.deposit,
        seller_credits=prior_le.seller_credits,
        lender_credits=payload.lender_credits if payload.lender_credits is not None else prior_le.lender_credits,
        trid_deadline=prior_le.trid_deadline,
        coc_reason=payload.coc_reason,
        revision_reason=payload.revision_reason,
        supersedes_le_id=str(prior_le.id),
        issued_by_id=str(current_user.id),
    )
    db.add(new_le)
    await db.flush()

    # Carry over fee schedule from prior LE (if no new fees provided)
    source_fees = payload.fees if payload.fees else [
        type("F", (), {
            "respa_section": f.respa_section,
            "fee_name": f.fee_name,
            "fee_amount": f.fee_amount,
            "paid_by": f.paid_by,
            "paid_to": f.paid_to,
            "is_finance_charge": f.is_finance_charge,
            "sort_order": f.sort_order,
        })()
        for f in prior_le.fees
    ]
    fee_objs = _build_fees(new_le, source_fees)
    for f in fee_objs:
        db.add(f)
    await db.flush()

    await db.refresh(new_le)
    _recalculate(new_le)
    await db.commit()
    await db.refresh(new_le)
    return LoanEstimateResponse.model_validate(new_le)

from datetime import date, datetime, timedelta, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, case, update
from sqlalchemy.orm import aliased

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.loan import Loan, LoanStatus, LoanPurposeType, LoanType
from app.models.borrower import Borrower, BorrowerClassification
from app.models.loan_estimate import LoanEstimate, LoanEstimateFee, LEStatus, ToleranceCategory
from app.models.closing import ClosingDisclosure, ClosingDisclosureFee, CDStatus
from app.models.hmda_record import HMDARecord, HMDAActionTaken, HMDAValidationStatus
from app.models.adverse_action import (
    AdverseActionNotice,
    AdverseActionType,
    AdverseActionStatus,
)
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.compliance import (
    HMDARecordResponse,
    HMDARecordUpdate,
    PaginatedHMDARecords,
    HMDAValidationResult,
    AdverseActionCreate,
    AdverseActionUpdate,
    AdverseActionResponse,
    PaginatedAdverseActions,
    TRIDExceptionItem,
    PaginatedTRIDExceptions,
    ComplianceDashboardStats,
)

router = APIRouter(prefix="/compliance", tags=["Compliance"])

# HMDA loan purpose mapping
LOAN_PURPOSE_MAP = {
    LoanPurposeType.PURCHASE: "1",
    LoanPurposeType.REFINANCE: "31",
    LoanPurposeType.CASH_OUT_REFINANCE: "32",
    LoanPurposeType.CONSTRUCTION_TO_PERMANENT: "4",
}

# HMDA loan type mapping
LOAN_TYPE_MAP = {
    LoanType.CONVENTIONAL: "1",
    LoanType.FHA: "2",
    LoanType.VA: "3",
    LoanType.USDA: "4",
}

# HMDA action from loan status
STATUS_TO_ACTION = {
    LoanStatus.FUNDED: HMDAActionTaken.ORIGINATED,
    LoanStatus.DECLINED: HMDAActionTaken.DENIED,
    LoanStatus.WITHDRAWN: HMDAActionTaken.WITHDRAWN,
}


# ─── Dashboard Stats ──────────────────────────────────────────────────────────


@router.get("/dashboard", response_model=ComplianceDashboardStats)
async def get_compliance_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ComplianceDashboardStats:
    today = date.today()

    # HMDA stats
    hmda_q = select(
        func.count().label("total"),
        func.sum(case((HMDARecord.validation_status == HMDAValidationStatus.VALID, 1), else_=0)).label("valid"),
        func.sum(case((HMDARecord.validation_status == HMDAValidationStatus.ERRORS, 1), else_=0)).label("errors"),
        func.sum(case((HMDARecord.validation_status == HMDAValidationStatus.PENDING, 1), else_=0)).label("pending"),
    )
    hmda_row = (await db.execute(hmda_q)).one()

    # Adverse action stats
    aa_total_q = select(func.count()).select_from(AdverseActionNotice)
    aa_total = (await db.execute(aa_total_q)).scalar_one()

    aa_pending_q = select(func.count()).where(
        AdverseActionNotice.status.in_([AdverseActionStatus.DRAFT, AdverseActionStatus.PENDING_REVIEW])
    )
    aa_pending = (await db.execute(aa_pending_q)).scalar_one()

    aa_overdue_q = select(func.count()).where(
        and_(
            AdverseActionNotice.status.in_([AdverseActionStatus.DRAFT, AdverseActionStatus.PENDING_REVIEW]),
            AdverseActionNotice.notice_deadline < today,
        )
    )
    aa_overdue = (await db.execute(aa_overdue_q)).scalar_one()

    first_of_month = today.replace(day=1)
    aa_sent_q = select(func.count()).where(
        and_(
            AdverseActionNotice.status == AdverseActionStatus.SENT,
            AdverseActionNotice.sent_date >= first_of_month,
        )
    )
    aa_sent_this_month = (await db.execute(aa_sent_q)).scalar_one()

    # TRID stats
    trid_total_q = select(func.count(func.distinct(LoanEstimate.loan_id))).where(
        LoanEstimate.status.in_([LEStatus.ISSUED, LEStatus.REVISED])
    )
    trid_total = (await db.execute(trid_total_q)).scalar_one()

    # LE deadline approaching (within 1 business day)
    deadline_threshold = today + timedelta(days=2)
    trid_approaching_q = select(func.count()).where(
        and_(
            LoanEstimate.status == LEStatus.DRAFT,
            LoanEstimate.trid_deadline.isnot(None),
            LoanEstimate.trid_deadline <= deadline_threshold,
            LoanEstimate.trid_deadline >= today,
        )
    )
    trid_approaching = (await db.execute(trid_approaching_q)).scalar_one()

    # Loan counts by status
    loans_q = select(
        func.sum(case((Loan.status == LoanStatus.FUNDED, 1), else_=0)).label("originated"),
        func.sum(case((Loan.status == LoanStatus.DECLINED, 1), else_=0)).label("denied"),
        func.sum(case((Loan.status == LoanStatus.WITHDRAWN, 1), else_=0)).label("withdrawn"),
        func.sum(case((Loan.status.in_([
            LoanStatus.NEW, LoanStatus.IN_PROCESS,
            LoanStatus.CONDITIONAL_APPROVAL, LoanStatus.APPROVED,
            LoanStatus.SUSPENDED,
        ]), 1), else_=0)).label("in_process"),
    )
    loans_row = (await db.execute(loans_q)).one()

    return ComplianceDashboardStats(
        hmda_total_records=hmda_row.total or 0,
        hmda_valid=hmda_row.valid or 0,
        hmda_errors=hmda_row.errors or 0,
        hmda_pending=hmda_row.pending or 0,
        aa_total=aa_total,
        aa_pending_send=aa_pending,
        aa_overdue=aa_overdue,
        aa_sent_this_month=aa_sent_this_month,
        trid_total_loans_with_le=trid_total,
        trid_tolerance_exceptions=0,  # calculated separately when needed
        trid_le_deadline_approaching=trid_approaching,
        loans_originated=loans_row.originated or 0,
        loans_denied=loans_row.denied or 0,
        loans_withdrawn=loans_row.withdrawn or 0,
        loans_in_process=loans_row.in_process or 0,
    )


# ─── HMDA LAR ─────────────────────────────────────────────────────────────────


@router.get("/hmda", response_model=PaginatedHMDARecords)
async def list_hmda_records(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
    validation_status: Optional[HMDAValidationStatus] = Query(default=None),
    action_taken: Optional[HMDAActionTaken] = Query(default=None),
    activity_year: Optional[int] = Query(default=None),
    search: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PaginatedHMDARecords:
    primary_borrower_sq = (
        select(
            Borrower.loan_id,
            (Borrower.first_name + " " + Borrower.last_name).label("name"),
        )
        .where(Borrower.borrower_classification == BorrowerClassification.PRIMARY)
        .subquery("primary_borrowers")
    )

    base = (
        select(HMDARecord, Loan.loan_number, Loan.status.label("loan_status"), primary_borrower_sq.c.name.label("borrower_name"))
        .join(Loan, Loan.id == HMDARecord.loan_id)
        .outerjoin(primary_borrower_sq, primary_borrower_sq.c.loan_id == HMDARecord.loan_id)
    )

    filters = []
    if validation_status is not None:
        filters.append(HMDARecord.validation_status == validation_status)
    if action_taken is not None:
        filters.append(HMDARecord.action_taken == action_taken)
    if activity_year is not None:
        filters.append(HMDARecord.activity_year == activity_year)
    if search:
        term = f"%{search}%"
        filters.append(
            or_(
                Loan.loan_number.ilike(term),
                primary_borrower_sq.c.name.ilike(term),
            )
        )
    if filters:
        base = base.where(and_(*filters))

    count_q = select(func.count()).select_from(base.with_only_columns(HMDARecord.id).subquery())
    total = (await db.execute(count_q)).scalar_one()

    rows = (await db.execute(
        base.order_by(HMDARecord.created_at.desc()).offset(skip).limit(limit)
    )).all()

    items = []
    for row in rows:
        hmda = row[0]
        resp = HMDARecordResponse.model_validate(hmda)
        resp.loan_number = row[1]
        resp.loan_status = row[2]
        resp.borrower_name = row[3]
        items.append(resp)

    return PaginatedHMDARecords(items=items, total=total, skip=skip, limit=limit)


@router.post("/hmda/sync", response_model=dict)
async def sync_hmda_records(
    activity_year: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """
    Auto-populate HMDA records from all loans.
    Creates records for loans that don't have one yet,
    and updates existing records with latest loan data.
    """
    # Find loans without HMDA records
    existing_sq = select(HMDARecord.loan_id).subquery()
    missing_q = select(Loan).where(Loan.id.notin_(select(existing_sq.c.loan_id)))
    missing_loans = (await db.execute(missing_q)).scalars().all()

    created = 0
    for loan in missing_loans:
        action = STATUS_TO_ACTION.get(loan.status)
        hmda = HMDARecord(
            loan_id=loan.id,
            activity_year=activity_year,
            action_taken=action,
            action_taken_date=loan.estimated_close_date if action else None,
            loan_purpose=LOAN_PURPOSE_MAP.get(loan.loan_purpose_type),
            loan_type=LOAN_TYPE_MAP.get(loan.loan_type),
            loan_amount=loan.loan_amount,
            interest_rate=loan.note_rate_percent,
            property_state=loan.property_state,
            property_county=loan.property_county,
            application_date=loan.application_received_date,
            validation_status=HMDAValidationStatus.PENDING,
        )
        db.add(hmda)
        created += 1

    # Update existing records with latest loan data
    update_q = select(HMDARecord).where(HMDARecord.activity_year == activity_year)
    existing_records = (await db.execute(update_q)).scalars().all()
    updated = 0
    for hmda in existing_records:
        loan_q = select(Loan).where(Loan.id == hmda.loan_id)
        loan = (await db.execute(loan_q)).scalar_one_or_none()
        if loan:
            new_action = STATUS_TO_ACTION.get(loan.status)
            if new_action and hmda.action_taken != new_action:
                hmda.action_taken = new_action
                updated += 1
            hmda.loan_amount = loan.loan_amount
            hmda.interest_rate = loan.note_rate_percent

    await db.commit()
    return {"created": created, "updated": updated}


@router.post("/hmda/{loan_id}/validate", response_model=HMDAValidationResult)
async def validate_hmda_record(
    loan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> HMDAValidationResult:
    """Validate a single HMDA record for completeness and accuracy."""
    result = await db.execute(
        select(HMDARecord).where(HMDARecord.loan_id == loan_id)
    )
    hmda = result.scalar_one_or_none()
    if hmda is None:
        raise HTTPException(status_code=404, detail="HMDA record not found for this loan")

    errors: list[str] = []
    warnings: list[str] = []

    # Required fields validation
    if hmda.action_taken is None:
        errors.append("Action taken is required")
    if hmda.action_taken_date is None:
        errors.append("Action taken date is required")
    if hmda.loan_purpose is None:
        errors.append("Loan purpose is required")
    if hmda.loan_type is None:
        errors.append("Loan type is required")
    if hmda.loan_amount is None:
        errors.append("Loan amount is required")
    if hmda.property_state is None:
        errors.append("Property state is required")

    # Conditional fields
    if hmda.action_taken == HMDAActionTaken.DENIED and hmda.denial_reason_1 is None:
        errors.append("At least one denial reason is required for denied applications")

    # Demographic warnings
    if hmda.applicant_ethnicity is None:
        warnings.append("Applicant ethnicity not reported")
    if hmda.applicant_race is None:
        warnings.append("Applicant race not reported")
    if hmda.applicant_sex is None:
        warnings.append("Applicant sex not reported")
    if hmda.census_tract is None:
        warnings.append("Census tract not geocoded")
    if hmda.applicant_income is None:
        warnings.append("Applicant income not reported")

    # Interest rate for originated loans
    if hmda.action_taken == HMDAActionTaken.ORIGINATED and hmda.interest_rate is None:
        errors.append("Interest rate is required for originated loans")

    is_valid = len(errors) == 0
    new_status = (
        HMDAValidationStatus.VALID if is_valid
        else HMDAValidationStatus.ERRORS
    )
    if is_valid and warnings:
        new_status = HMDAValidationStatus.WARNINGS

    hmda.validation_status = new_status
    hmda.validation_errors = str(errors + warnings) if (errors or warnings) else None
    await db.commit()

    return HMDAValidationResult(
        loan_id=hmda.loan_id,
        is_valid=is_valid,
        errors=errors,
        warnings=warnings,
    )


@router.patch("/hmda/{loan_id}", response_model=HMDARecordResponse)
async def update_hmda_record(
    loan_id: str,
    payload: HMDARecordUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> HMDARecordResponse:
    result = await db.execute(
        select(HMDARecord).where(HMDARecord.loan_id == loan_id)
    )
    hmda = result.scalar_one_or_none()
    if hmda is None:
        raise HTTPException(status_code=404, detail="HMDA record not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(hmda, field, value)

    db.add(AuditLog(
        loan_id=loan_id,
        user_id=current_user.id,
        action="hmda.updated",
        entity_type="hmda_record",
        entity_id=hmda.id,
        after_value=update_data,
        ip_address=request.client.host if request.client else None,
    ))

    await db.commit()
    await db.refresh(hmda)
    return HMDARecordResponse.model_validate(hmda)


# ─── Adverse Action Notices ──────────────────────────────────────────────────


@router.get("/adverse-actions", response_model=PaginatedAdverseActions)
async def list_adverse_actions(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
    status_filter: Optional[AdverseActionStatus] = Query(default=None, alias="status"),
    overdue_only: bool = Query(default=False),
    search: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PaginatedAdverseActions:
    primary_borrower_sq = (
        select(
            Borrower.loan_id,
            (Borrower.first_name + " " + Borrower.last_name).label("name"),
        )
        .where(Borrower.borrower_classification == BorrowerClassification.PRIMARY)
        .subquery("primary_borrowers")
    )

    base = (
        select(
            AdverseActionNotice,
            Loan.loan_number,
            primary_borrower_sq.c.name.label("borrower_name"),
        )
        .join(Loan, Loan.id == AdverseActionNotice.loan_id)
        .outerjoin(primary_borrower_sq, primary_borrower_sq.c.loan_id == AdverseActionNotice.loan_id)
    )

    filters = []
    if status_filter is not None:
        filters.append(AdverseActionNotice.status == status_filter)
    if overdue_only:
        filters.append(and_(
            AdverseActionNotice.status.in_([AdverseActionStatus.DRAFT, AdverseActionStatus.PENDING_REVIEW]),
            AdverseActionNotice.notice_deadline < date.today(),
        ))
    if search:
        term = f"%{search}%"
        filters.append(
            or_(
                Loan.loan_number.ilike(term),
                primary_borrower_sq.c.name.ilike(term),
            )
        )
    if filters:
        base = base.where(and_(*filters))

    count_q = select(func.count()).select_from(base.with_only_columns(AdverseActionNotice.id).subquery())
    total = (await db.execute(count_q)).scalar_one()

    rows = (await db.execute(
        base.order_by(AdverseActionNotice.notice_deadline.asc()).offset(skip).limit(limit)
    )).all()

    items = []
    for row in rows:
        aa = row[0]
        resp = AdverseActionResponse.model_validate(aa)
        resp.loan_number = row[1]
        resp.borrower_name = row[2]
        items.append(resp)

    return PaginatedAdverseActions(items=items, total=total, skip=skip, limit=limit)


@router.post("/{loan_id}/adverse-action", response_model=AdverseActionResponse)
async def create_adverse_action(
    loan_id: str,
    payload: AdverseActionCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> AdverseActionResponse:
    loan = (await db.execute(select(Loan).where(Loan.id == loan_id))).scalar_one_or_none()
    if loan is None:
        raise HTTPException(status_code=404, detail="Loan not found")

    # Calculate 30-day notice deadline per ECOA Reg B
    notice_deadline = payload.decision_date + timedelta(days=30)

    notice = AdverseActionNotice(
        loan_id=loan_id,
        action_type=payload.action_type,
        reason_code_1=payload.reason_code_1,
        reason_code_2=payload.reason_code_2,
        reason_code_3=payload.reason_code_3,
        reason_code_4=payload.reason_code_4,
        decision_date=payload.decision_date,
        notice_deadline=notice_deadline,
        delivery_method=payload.delivery_method,
        notes=payload.notes,
        created_by_id=current_user.id,
    )
    db.add(notice)

    db.add(AuditLog(
        loan_id=loan_id,
        user_id=current_user.id,
        action="adverse_action.created",
        entity_type="adverse_action_notice",
        entity_id=notice.id,
        after_value={
            "action_type": payload.action_type.value,
            "decision_date": str(payload.decision_date),
        },
        ip_address=request.client.host if request.client else None,
    ))

    await db.commit()
    await db.refresh(notice)
    return AdverseActionResponse.model_validate(notice)


@router.patch("/adverse-actions/{notice_id}", response_model=AdverseActionResponse)
async def update_adverse_action(
    notice_id: str,
    payload: AdverseActionUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> AdverseActionResponse:
    result = await db.execute(
        select(AdverseActionNotice).where(AdverseActionNotice.id == notice_id)
    )
    notice = result.scalar_one_or_none()
    if notice is None:
        raise HTTPException(status_code=404, detail="Adverse action notice not found")

    update_data = payload.model_dump(exclude_unset=True)

    # If marking as sent, record who sent it
    if update_data.get("status") == AdverseActionStatus.SENT:
        notice.sent_by_id = current_user.id
        if notice.sent_date is None:
            notice.sent_date = date.today()

    for field, value in update_data.items():
        setattr(notice, field, value)

    db.add(AuditLog(
        loan_id=notice.loan_id,
        user_id=current_user.id,
        action="adverse_action.updated",
        entity_type="adverse_action_notice",
        entity_id=notice.id,
        after_value={k: str(v) for k, v in update_data.items()},
        ip_address=request.client.host if request.client else None,
    ))

    await db.commit()
    await db.refresh(notice)
    return AdverseActionResponse.model_validate(notice)


# ─── TRID Tolerance Exceptions ───────────────────────────────────────────────


@router.get("/trid-exceptions", response_model=PaginatedTRIDExceptions)
async def list_trid_exceptions(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PaginatedTRIDExceptions:
    """
    List loans where LE-to-CD fee variance exceeds TRID tolerance thresholds.
    Compares the latest issued LE against the latest CD for each loan.
    """
    primary_borrower_sq = (
        select(
            Borrower.loan_id,
            (Borrower.first_name + " " + Borrower.last_name).label("name"),
        )
        .where(Borrower.borrower_classification == BorrowerClassification.PRIMARY)
        .subquery("primary_borrowers")
    )

    # Get loans that have both an LE and CD
    le_sq = (
        select(
            LoanEstimate.loan_id,
            LoanEstimate.id.label("le_id"),
            LoanEstimate.version_number,
            LoanEstimate.issued_date,
            func.row_number()
            .over(partition_by=LoanEstimate.loan_id, order_by=LoanEstimate.version_number.desc())
            .label("rn"),
        )
        .where(LoanEstimate.status.in_([LEStatus.ISSUED, LEStatus.REVISED]))
        .subquery("le_ranked")
    )
    latest_le = select(le_sq).where(le_sq.c.rn == 1).subquery("latest_le")

    cd_sq = (
        select(
            ClosingDisclosure.loan_id,
            ClosingDisclosure.id.label("cd_id"),
            func.row_number()
            .over(partition_by=ClosingDisclosure.loan_id, order_by=ClosingDisclosure.created_at.desc())
            .label("rn"),
        )
        .subquery("cd_ranked")
    )
    latest_cd = select(cd_sq).where(cd_sq.c.rn == 1).subquery("latest_cd")

    # Query loans with both LE and CD
    base = (
        select(
            Loan.id,
            Loan.loan_number,
            Loan.status,
            primary_borrower_sq.c.name.label("borrower_name"),
            latest_le.c.issued_date,
            latest_le.c.version_number,
            latest_le.c.le_id,
            latest_cd.c.cd_id,
        )
        .join(latest_le, latest_le.c.loan_id == Loan.id)
        .join(latest_cd, latest_cd.c.loan_id == Loan.id)
        .outerjoin(primary_borrower_sq, primary_borrower_sq.c.loan_id == Loan.id)
    )

    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar_one()

    rows = (await db.execute(base.offset(skip).limit(limit))).all()

    items: list[TRIDExceptionItem] = []
    for row in rows:
        loan_id, loan_number, loan_status, borrower_name, le_issued, le_version, le_id, cd_id = row

        # Sum LE fees by tolerance category (zero tolerance only for exception reporting)
        le_fees_q = select(
            func.sum(LoanEstimateFee.fee_amount),
        ).where(
            and_(
                LoanEstimateFee.loan_estimate_id == le_id,
                LoanEstimateFee.tolerance_category == ToleranceCategory.ZERO,
            )
        )
        le_total = (await db.execute(le_fees_q)).scalar_one_or_none() or 0

        cd_fees_q = select(
            func.sum(ClosingDisclosureFee.fee_amount),
        ).where(
            and_(
                ClosingDisclosureFee.closing_disclosure_id == cd_id,
                ClosingDisclosureFee.tolerance_category == ToleranceCategory.ZERO,
            )
        )
        cd_total = (await db.execute(cd_fees_q)).scalar_one_or_none() or 0

        variance = cd_total - le_total
        is_violation = variance > 0  # Zero tolerance: CD cannot exceed LE

        if is_violation:
            items.append(TRIDExceptionItem(
                loan_id=loan_id,
                loan_number=loan_number,
                borrower_name=borrower_name,
                loan_status=loan_status,
                le_issued_date=le_issued,
                le_version=le_version,
                tolerance_category="Zero",
                le_total=le_total,
                cd_total=cd_total,
                variance=variance,
                threshold=0,
                is_violation=True,
            ))

    return PaginatedTRIDExceptions(
        items=items,
        total=len(items),
        skip=skip,
        limit=limit,
    )

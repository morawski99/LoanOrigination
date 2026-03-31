from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, case
from sqlalchemy.orm import aliased

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.loan import Loan, LoanStatus, LoanType
from app.models.borrower import Borrower, BorrowerClassification
from app.models.condition import Condition, ConditionStatus, ConditionType
from app.models.aus_result import AUSResult
from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.underwriting_decision import UnderwritingDecision, UnderwritingDecisionType
from app.schemas.underwriting import (
    UnderwritingDecisionCreate,
    UnderwritingDecisionResponse,
    UnderwritingQueueItem,
    PaginatedUnderwritingQueue,
    UnderwritingQueueStats,
    AssignUnderwriterPayload,
)
from app.schemas.loan import LoanResponse

router = APIRouter(prefix="/underwriting", tags=["Underwriting"])

# Statuses that appear in the underwriting queue
QUEUE_STATUSES = [
    LoanStatus.IN_PROCESS,
    LoanStatus.CONDITIONAL_APPROVAL,
    LoanStatus.SUSPENDED,
]

# Map decision types to loan statuses
DECISION_TO_STATUS = {
    UnderwritingDecisionType.APPROVED: LoanStatus.APPROVED,
    UnderwritingDecisionType.CONDITIONAL_APPROVAL: LoanStatus.CONDITIONAL_APPROVAL,
    UnderwritingDecisionType.SUSPENDED: LoanStatus.SUSPENDED,
    UnderwritingDecisionType.DECLINED: LoanStatus.DECLINED,
}


# ─── Queue listing ─────────────────────────────────────────────────────────────

@router.get("/queue", response_model=PaginatedUnderwritingQueue)
async def list_underwriting_queue(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
    status_filter: Optional[LoanStatus] = Query(default=None, alias="status"),
    loan_type: Optional[LoanType] = Query(default=None),
    assigned_underwriter_id: Optional[str] = Query(default=None),
    unassigned_only: bool = Query(default=False),
    search: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PaginatedUnderwritingQueue:
    # Subquery: primary borrower name
    primary_borrower_sq = (
        select(
            Borrower.loan_id,
            (Borrower.first_name + " " + Borrower.last_name).label("name"),
        )
        .where(Borrower.borrower_classification == BorrowerClassification.PRIMARY)
        .subquery("primary_borrowers")
    )

    # Subquery: latest AUS result per loan
    aus_rank = (
        select(
            AUSResult.loan_id,
            AUSResult.finding,
            AUSResult.system,
            func.row_number()
            .over(partition_by=AUSResult.loan_id, order_by=AUSResult.run_at.desc())
            .label("rn"),
        )
        .subquery("aus_ranked")
    )
    latest_aus = (
        select(
            aus_rank.c.loan_id,
            aus_rank.c.finding.label("aus_finding"),
            aus_rank.c.system.label("aus_system"),
        )
        .where(aus_rank.c.rn == 1)
        .subquery("latest_aus")
    )

    # Subquery: condition counts per loan
    conditions_sq = (
        select(
            Condition.loan_id,
            func.count().label("total"),
            func.sum(
                case((Condition.status == ConditionStatus.OPEN, 1), else_=0)
            ).label("open_count"),
        )
        .group_by(Condition.loan_id)
        .subquery("cond_counts")
    )

    uw_user = aliased(User, flat=True)

    base_select = (
        select(
            Loan,
            primary_borrower_sq.c.name.label("borrower_name"),
            uw_user.full_name.label("uw_name"),
            latest_aus.c.aus_finding,
            latest_aus.c.aus_system,
            func.coalesce(conditions_sq.c.open_count, 0).label("conditions_open"),
            func.coalesce(conditions_sq.c.total, 0).label("conditions_total"),
        )
        .outerjoin(primary_borrower_sq, primary_borrower_sq.c.loan_id == Loan.id)
        .outerjoin(uw_user, uw_user.id == Loan.assigned_underwriter_id)
        .outerjoin(latest_aus, latest_aus.c.loan_id == Loan.id)
        .outerjoin(conditions_sq, conditions_sq.c.loan_id == Loan.id)
    )

    # Default: only queue-eligible statuses
    filters = []
    if status_filter is not None:
        filters.append(Loan.status == status_filter)
    else:
        filters.append(Loan.status.in_(QUEUE_STATUSES))

    if loan_type is not None:
        filters.append(Loan.loan_type == loan_type)
    if assigned_underwriter_id is not None:
        filters.append(Loan.assigned_underwriter_id == assigned_underwriter_id)
    if unassigned_only:
        filters.append(Loan.assigned_underwriter_id.is_(None))
    if search:
        term = f"%{search}%"
        filters.append(
            or_(
                Loan.loan_number.ilike(term),
                primary_borrower_sq.c.name.ilike(term),
            )
        )

    base_select = base_select.where(and_(*filters))

    # Count
    count_q = select(func.count()).select_from(
        base_select.with_only_columns(Loan.id).subquery()
    )
    total = (await db.execute(count_q)).scalar_one()

    # Fetch page
    rows = (
        await db.execute(
            base_select.order_by(Loan.status_changed_at.asc().nullslast())
            .offset(skip)
            .limit(limit)
        )
    ).all()

    now = datetime.now(timezone.utc)
    items: list[UnderwritingQueueItem] = []
    for row in rows:
        loan_obj = row[0]
        borrower_name = row[1]
        uw_name = row[2]
        aus_finding = row[3]
        aus_system = row[4]
        cond_open = row[5]
        cond_total = row[6]

        days_in_status: Optional[int] = None
        if loan_obj.status_changed_at is not None:
            changed = loan_obj.status_changed_at
            if changed.tzinfo is None:
                changed = changed.replace(tzinfo=timezone.utc)
            days_in_status = (now - changed).days

        items.append(
            UnderwritingQueueItem(
                id=loan_obj.id,
                loan_number=loan_obj.loan_number,
                status=loan_obj.status,
                loan_amount=loan_obj.loan_amount,
                loan_purpose_type=loan_obj.loan_purpose_type,
                loan_type=loan_obj.loan_type,
                property_city=loan_obj.property_city,
                property_state=loan_obj.property_state,
                created_at=loan_obj.created_at,
                primary_borrower_name=borrower_name,
                assigned_underwriter_name=uw_name,
                assigned_underwriter_id=loan_obj.assigned_underwriter_id,
                days_in_status=days_in_status,
                latest_aus_finding=aus_finding,
                latest_aus_system=aus_system,
                conditions_open=cond_open,
                conditions_total=cond_total,
            )
        )

    return PaginatedUnderwritingQueue(items=items, total=total, skip=skip, limit=limit)


# ─── Queue stats ───────────────────────────────────────────────────────────────

@router.get("/queue/stats", response_model=UnderwritingQueueStats)
async def get_queue_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> UnderwritingQueueStats:
    # Total in queue
    total_q = select(func.count()).where(Loan.status.in_(QUEUE_STATUSES))
    total = (await db.execute(total_q)).scalar_one()

    # Unassigned
    unassigned_q = select(func.count()).where(
        and_(
            Loan.status.in_(QUEUE_STATUSES),
            Loan.assigned_underwriter_id.is_(None),
        )
    )
    unassigned = (await db.execute(unassigned_q)).scalar_one()

    # Average days in status
    now = datetime.now(timezone.utc)
    avg_q = select(
        func.avg(
            func.julianday(func.datetime("now"))
            - func.julianday(Loan.status_changed_at)
        )
    ).where(
        and_(
            Loan.status.in_(QUEUE_STATUSES),
            Loan.status_changed_at.isnot(None),
        )
    )
    try:
        avg_days = (await db.execute(avg_q)).scalar_one_or_none()
        avg_days = round(float(avg_days), 1) if avg_days else None
    except Exception:
        avg_days = None

    # Count by status
    by_status_q = (
        select(Loan.status, func.count())
        .where(Loan.status.in_(QUEUE_STATUSES))
        .group_by(Loan.status)
    )
    by_status_rows = (await db.execute(by_status_q)).all()
    by_status = {row[0].value: row[1] for row in by_status_rows}

    return UnderwritingQueueStats(
        total_in_queue=total,
        unassigned_count=unassigned,
        avg_days_in_status=avg_days,
        by_status=by_status,
    )


# ─── Assign underwriter ───────────────────────────────────────────────────────

@router.post("/{loan_id}/assign", response_model=LoanResponse)
async def assign_underwriter(
    loan_id: str,
    payload: AssignUnderwriterPayload,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> LoanResponse:
    result = await db.execute(select(Loan).where(Loan.id == loan_id))
    loan = result.scalar_one_or_none()
    if loan is None:
        raise HTTPException(status_code=404, detail="Loan not found")

    before = loan.assigned_underwriter_id
    loan.assigned_underwriter_id = str(payload.underwriter_id) if payload.underwriter_id else None

    audit = AuditLog(
        loan_id=loan.id,
        user_id=current_user.id,
        action="underwriting.assigned",
        entity_type="loan",
        entity_id=loan.id,
        before_value={"assigned_underwriter_id": before},
        after_value={"assigned_underwriter_id": loan.assigned_underwriter_id},
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(loan)
    return LoanResponse.model_validate(loan)


# ─── Record decision ──────────────────────────────────────────────────────────

@router.post("/{loan_id}/decision", response_model=UnderwritingDecisionResponse)
async def create_decision(
    loan_id: str,
    payload: UnderwritingDecisionCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> UnderwritingDecisionResponse:
    result = await db.execute(select(Loan).where(Loan.id == loan_id))
    loan = result.scalar_one_or_none()
    if loan is None:
        raise HTTPException(status_code=404, detail="Loan not found")

    # Validate loan is in an underwriting-eligible status
    eligible = QUEUE_STATUSES + [LoanStatus.NEW]
    if loan.status not in eligible:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot make underwriting decision on loan in '{loan.status.value}' status",
        )

    now = datetime.now(timezone.utc)

    # Create the decision record
    decision = UnderwritingDecision(
        loan_id=loan_id,
        decision_type=payload.decision_type,
        decided_by_id=current_user.id,
        notes=payload.notes,
        decided_at=now,
    )
    db.add(decision)
    await db.flush()

    # Update loan status
    old_status = loan.status
    new_status = DECISION_TO_STATUS[payload.decision_type]
    loan.status = new_status
    loan.status_changed_at = now

    # Create PTA conditions if provided
    if payload.conditions:
        for cond_data in payload.conditions:
            cond = Condition(
                loan_id=loan_id,
                condition_type=cond_data.condition_type,
                description=cond_data.description,
                due_date=cond_data.due_date,
                assigned_to=cond_data.assigned_to,
                created_by_id=current_user.id,
            )
            db.add(cond)

    # Audit logs
    db.add(AuditLog(
        loan_id=loan.id,
        user_id=current_user.id,
        action="underwriting.decision",
        entity_type="underwriting_decision",
        entity_id=decision.id,
        after_value={
            "decision_type": payload.decision_type.value,
            "notes": payload.notes,
        },
        ip_address=request.client.host if request.client else None,
    ))

    if old_status != new_status:
        db.add(AuditLog(
            loan_id=loan.id,
            user_id=current_user.id,
            action="loan.status_changed",
            entity_type="loan",
            entity_id=loan.id,
            before_value={"status": old_status.value},
            after_value={"status": new_status.value},
            ip_address=request.client.host if request.client else None,
        ))

    await db.commit()
    await db.refresh(decision)
    return UnderwritingDecisionResponse.model_validate(decision)


# ─── Decision history ──────────────────────────────────────────────────────────

@router.get("/{loan_id}/decisions", response_model=List[UnderwritingDecisionResponse])
async def list_decisions(
    loan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[UnderwritingDecisionResponse]:
    result = await db.execute(
        select(UnderwritingDecision)
        .where(UnderwritingDecision.loan_id == loan_id)
        .order_by(UnderwritingDecision.decided_at.desc())
    )
    decisions = result.scalars().all()
    return [UnderwritingDecisionResponse.model_validate(d) for d in decisions]

from datetime import date, datetime, timezone
from typing import Optional
from uuid import UUID, uuid4
import random
import string

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.loan import Loan, LoanStatus
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.loan import (
    LoanCreate,
    LoanUpdate,
    LoanResponse,
    LoanListItem,
    PaginatedLoanList,
)

router = APIRouter(prefix="/loans", tags=["Loans"])


def _generate_loan_number() -> str:
    """
    Generate a unique loan number in the format LN-YYYYMMDD-XXXXX.
    The suffix is a random 5-character alphanumeric string.
    """
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"LN-{today}-{suffix}"


@router.get("", response_model=PaginatedLoanList, status_code=status.HTTP_200_OK)
async def list_loans(
    skip: int = Query(default=0, ge=0, description="Number of records to skip"),
    limit: int = Query(default=20, ge=1, le=200, description="Maximum records to return"),
    status_filter: Optional[LoanStatus] = Query(
        default=None, alias="status", description="Filter by loan status"
    ),
    search: Optional[str] = Query(
        default=None, description="Search by loan number (partial match)"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PaginatedLoanList:
    """
    Return a paginated list of loan records.
    Optionally filter by status and search by loan number.
    """
    conditions = []
    if status_filter is not None:
        conditions.append(Loan.status == status_filter)
    if search:
        conditions.append(Loan.loan_number.ilike(f"%{search}%"))

    base_query = select(Loan)
    if conditions:
        base_query = base_query.where(and_(*conditions))

    # Count total matching records
    count_query = select(func.count()).select_from(
        base_query.subquery()
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Fetch page
    page_query = (
        base_query
        .order_by(Loan.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(page_query)
    loans = result.scalars().all()

    return PaginatedLoanList(
        items=[LoanListItem.model_validate(loan) for loan in loans],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=LoanResponse, status_code=status.HTTP_201_CREATED)
async def create_loan(
    payload: LoanCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> LoanResponse:
    """
    Create a new loan application.
    Auto-generates a unique loan number and sets the initial status to New.
    """
    # Ensure loan number uniqueness with retry
    for _ in range(5):
        candidate = _generate_loan_number()
        existing = await db.execute(
            select(Loan.id).where(Loan.loan_number == candidate)
        )
        if existing.scalar_one_or_none() is None:
            loan_number = candidate
            break
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate a unique loan number. Please retry.",
        )

    loan = Loan(
        loan_number=loan_number,
        status=LoanStatus.NEW,
        loan_purpose_type=payload.loan_purpose_type,
        loan_type=payload.loan_type,
        loan_amount=payload.loan_amount,
        property_address_line=payload.property_address_line,
        property_city=payload.property_city,
        property_state=payload.property_state,
        property_zip=payload.property_zip,
        created_by_id=current_user.id,
    )
    db.add(loan)
    await db.flush()  # get loan.id before creating audit log

    # Create audit log entry
    audit = AuditLog(
        loan_id=loan.id,
        user_id=current_user.id,
        action="loan.created",
        entity_type="loan",
        entity_id=loan.id,
        after_value={
            "loan_number": loan_number,
            "status": LoanStatus.NEW.value,
            "loan_amount": str(payload.loan_amount),
            "loan_purpose_type": payload.loan_purpose_type.value,
            "loan_type": payload.loan_type.value,
        },
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)

    await db.commit()
    await db.refresh(loan)
    return LoanResponse.model_validate(loan)


@router.get("/{loan_id}", response_model=LoanResponse, status_code=status.HTTP_200_OK)
async def get_loan(
    loan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> LoanResponse:
    """
    Retrieve a single loan by its UUID, including all borrowers and documents.
    """
    result = await db.execute(select(Loan).where(Loan.id == loan_id))
    loan = result.scalar_one_or_none()

    if loan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Loan with id={loan_id} not found.",
        )

    return LoanResponse.model_validate(loan)


@router.patch("/{loan_id}", response_model=LoanResponse, status_code=status.HTTP_200_OK)
async def update_loan(
    loan_id: UUID,
    payload: LoanUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> LoanResponse:
    """
    Partially update a loan's fields.
    Records all changes in the audit log with before/after snapshots.
    """
    result = await db.execute(select(Loan).where(Loan.id == loan_id))
    loan = result.scalar_one_or_none()

    if loan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Loan with id={loan_id} not found.",
        )

    # Build before snapshot for audit
    before_snapshot: dict = {}
    update_data = payload.model_dump(exclude_none=True)

    for field, new_value in update_data.items():
        current_value = getattr(loan, field)
        before_snapshot[field] = str(current_value) if current_value is not None else None
        setattr(loan, field, new_value)

    if update_data:
        audit = AuditLog(
            loan_id=loan.id,
            user_id=current_user.id,
            action="loan.updated",
            entity_type="loan",
            entity_id=loan.id,
            before_value=before_snapshot,
            after_value={
                k: str(v) if v is not None else None
                for k, v in update_data.items()
            },
            ip_address=request.client.host if request.client else None,
        )
        db.add(audit)

    await db.commit()
    await db.refresh(loan)
    return LoanResponse.model_validate(loan)

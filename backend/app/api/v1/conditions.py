from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.loan import Loan
from app.models.condition import Condition, ConditionStatus
from app.models.user import User
from app.schemas.condition import ConditionCreate, ConditionUpdate, ConditionResponse

router = APIRouter()


@router.get(
    "/{loan_id}/conditions",
    response_model=List[ConditionResponse],
    status_code=status.HTTP_200_OK,
    summary="List all conditions for a loan",
)
async def list_conditions(
    loan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[Condition]:
    loan = await db.get(Loan, str(loan_id))
    if not loan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan not found")

    result = await db.execute(
        select(Condition)
        .where(Condition.loan_id == str(loan_id))
        .order_by(Condition.created_at.asc())
    )
    return list(result.scalars().all())


@router.post(
    "/{loan_id}/conditions",
    response_model=ConditionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a condition for a loan",
)
async def create_condition(
    loan_id: UUID,
    payload: ConditionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Condition:
    loan = await db.get(Loan, str(loan_id))
    if not loan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan not found")

    condition = Condition(
        loan_id=str(loan_id),
        condition_type=payload.condition_type,
        status=ConditionStatus.OPEN,
        description=payload.description,
        due_date=payload.due_date,
        assigned_to=payload.assigned_to,
        created_by_id=str(current_user.id),
    )

    db.add(condition)
    await db.commit()
    await db.refresh(condition)
    return condition


@router.patch(
    "/{loan_id}/conditions/{condition_id}",
    response_model=ConditionResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a condition",
)
async def update_condition(
    loan_id: UUID,
    condition_id: UUID,
    payload: ConditionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Condition:
    condition = await db.get(Condition, str(condition_id))
    if not condition or condition.loan_id != str(loan_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Condition not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(condition, field, value)

    await db.commit()
    await db.refresh(condition)
    return condition


@router.delete(
    "/{loan_id}/conditions/{condition_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a condition",
)
async def delete_condition(
    loan_id: UUID,
    condition_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    condition = await db.get(Condition, str(condition_id))
    if not condition or condition.loan_id != str(loan_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Condition not found")

    await db.delete(condition)
    await db.commit()

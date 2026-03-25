from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.loan import Loan
from app.models.aus_result import AUSResult
from app.models.user import User
from app.schemas.aus_result import AUSResultCreate, AUSResultResponse

router = APIRouter()


@router.get(
    "/{loan_id}/aus-results",
    response_model=List[AUSResultResponse],
    status_code=status.HTTP_200_OK,
    summary="List AUS submissions for a loan",
)
async def list_aus_results(
    loan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[AUSResult]:
    # Verify loan exists
    loan = await db.get(Loan, str(loan_id))
    if not loan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan not found")

    result = await db.execute(
        select(AUSResult)
        .where(AUSResult.loan_id == str(loan_id))
        .order_by(AUSResult.run_at.desc(), AUSResult.submission_number.desc())
    )
    return list(result.scalars().all())


@router.post(
    "/{loan_id}/aus-results",
    response_model=AUSResultResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log a new AUS submission",
)
async def create_aus_result(
    loan_id: UUID,
    payload: AUSResultCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> AUSResult:
    # Verify loan exists
    loan = await db.get(Loan, str(loan_id))
    if not loan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan not found")

    # Determine next submission number for this loan
    count_result = await db.execute(
        select(func.count()).where(AUSResult.loan_id == str(loan_id))
    )
    submission_number = (count_result.scalar() or 0) + 1

    aus_result = AUSResult(
        loan_id=str(loan_id),
        system=payload.system,
        casefile_id=payload.casefile_id,
        submission_number=submission_number,
        finding=payload.finding,
        max_ltv_percent=payload.max_ltv_percent,
        max_cltv_percent=payload.max_cltv_percent,
        reserves_months=payload.reserves_months,
        documentation_type=payload.documentation_type,
        doc_requirements=payload.doc_requirements,
        recommendations=payload.recommendations,
        findings_summary=payload.findings_summary,
        submitted_by_id=str(current_user.id),
        run_at=payload.run_at,
    )

    db.add(aus_result)
    await db.commit()
    await db.refresh(aus_result)
    return aus_result


@router.delete(
    "/{loan_id}/aus-results/{result_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an AUS submission record",
)
async def delete_aus_result(
    loan_id: UUID,
    result_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    aus_result = await db.get(AUSResult, str(result_id))
    if not aus_result or aus_result.loan_id != str(loan_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AUS result not found")

    await db.delete(aus_result)
    await db.commit()

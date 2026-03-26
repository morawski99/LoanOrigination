"""
URLA (Uniform Residential Loan Application) API endpoints.
All endpoints require authentication and verify loan/borrower ownership.
"""
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.loan import Loan
from app.models.borrower import Borrower
from app.models.residence import BorrowerResidence
from app.models.employment import BorrowerEmployment
from app.models.other_income import BorrowerOtherIncome
from app.models.asset import BorrowerAsset
from app.models.liability import BorrowerLiability
from app.models.reo import RealEstateOwned
from app.models.declaration import BorrowerDeclaration
from app.models.military_service import BorrowerMilitaryService
from app.models.demographics import BorrowerDemographics
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.urla import (
    URLAProgress,
    URLASectionStatus,
    FullBorrowerResponse,
    BorrowerCreate,
    BorrowerPersonalInfoUpdate,
    BorrowerResponse,
    ResidenceCreate,
    ResidenceUpdate,
    ResidenceResponse,
    EmploymentCreate,
    EmploymentUpdate,
    EmploymentResponse,
    OtherIncomeCreate,
    OtherIncomeResponse,
    AssetCreate,
    AssetUpdate,
    AssetResponse,
    LiabilityCreate,
    LiabilityUpdate,
    LiabilityResponse,
    REOCreate,
    REOUpdate,
    REOResponse,
    DeclarationUpsert,
    DeclarationResponse,
    MilitaryServiceUpsert,
    MilitaryServiceResponse,
    DemographicsUpsert,
    DemographicsResponse,
)

router = APIRouter(tags=["urla"])


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

async def _get_loan_or_404(loan_id: str, db: AsyncSession) -> Loan:
    result = await db.execute(select(Loan).where(Loan.id == loan_id))
    loan = result.scalar_one_or_none()
    if loan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Loan with id={loan_id} not found.",
        )
    return loan


async def _get_borrower_or_404(
    loan_id: str, borrower_id: str, db: AsyncSession
) -> Borrower:
    result = await db.execute(
        select(Borrower).where(
            Borrower.id == borrower_id,
            Borrower.loan_id == loan_id,
        )
    )
    borrower = result.scalar_one_or_none()
    if borrower is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Borrower with id={borrower_id} not found on loan {loan_id}.",
        )
    return borrower


def _compute_urla_progress(borrower: Borrower, loan: Optional[Loan] = None) -> URLAProgress:
    """Compute section completion status based on borrower data."""

    def _res_complete() -> URLASectionStatus:
        if not borrower.residences:
            return URLASectionStatus.NOT_STARTED
        current = [r for r in borrower.residences if r.is_current]
        if current:
            return URLASectionStatus.COMPLETED
        return URLASectionStatus.IN_PROGRESS

    def _emp_complete() -> URLASectionStatus:
        if not borrower.employments:
            return URLASectionStatus.NOT_STARTED
        return URLASectionStatus.COMPLETED

    def _assets_complete() -> URLASectionStatus:
        if borrower.assets or borrower.liabilities:
            return URLASectionStatus.COMPLETED
        return URLASectionStatus.NOT_STARTED

    def _personal_complete() -> URLASectionStatus:
        has_required = bool(
            borrower.first_name
            and borrower.last_name
            and borrower.email
            and borrower.phone
        )
        if not has_required:
            return URLASectionStatus.IN_PROGRESS
        has_extra = bool(
            borrower.citizenship_residency_type
            and borrower.marital_status_type
        )
        return URLASectionStatus.COMPLETED if has_extra else URLASectionStatus.IN_PROGRESS

    def _declarations_complete() -> URLASectionStatus:
        if borrower.declaration is None:
            return URLASectionStatus.NOT_STARTED
        decl = borrower.declaration
        all_answered = all(
            v is not None
            for v in [
                decl.occupancy_intent_type,
                decl.outstanding_judgment_indicator,
                decl.declared_bankruptcy_indicator,
                decl.foreclosure_indicator,
                decl.party_to_lawsuit_indicator,
                decl.federal_debt_delinquency_indicator,
                decl.alimony_obligation_indicator,
                decl.co_signer_indicator,
            ]
        )
        return URLASectionStatus.COMPLETED if all_answered else URLASectionStatus.IN_PROGRESS

    def _military_complete() -> URLASectionStatus:
        if borrower.military_service is None:
            return URLASectionStatus.NOT_STARTED
        return URLASectionStatus.COMPLETED

    def _demographics_complete() -> URLASectionStatus:
        if borrower.demographics is None:
            return URLASectionStatus.NOT_STARTED
        return URLASectionStatus.COMPLETED

    def _acknowledgments_complete() -> URLASectionStatus:
        all_agreed = all([
            borrower.agreed_app,
            borrower.agreed_credit_pull,
            borrower.agreed_ecoa,
            borrower.agreed_electronic,
        ])
        if all_agreed:
            return URLASectionStatus.COMPLETED
        any_agreed = any([
            borrower.agreed_app,
            borrower.agreed_credit_pull,
            borrower.agreed_ecoa,
            borrower.agreed_electronic,
        ])
        return URLASectionStatus.IN_PROGRESS if any_agreed else URLASectionStatus.NOT_STARTED

    def _loan_property_complete() -> URLASectionStatus:
        if loan is None:
            return URLASectionStatus.NOT_STARTED
        mismo = loan.mismo_data or {}
        has_title = bool(mismo.get("title_name") or mismo.get("title_manner"))
        has_price = bool(mismo.get("purchase_price"))
        if has_title and has_price:
            return URLASectionStatus.COMPLETED
        if has_title or has_price:
            return URLASectionStatus.IN_PROGRESS
        return URLASectionStatus.NOT_STARTED

    return URLAProgress(
        personal_info=_personal_complete(),
        residence=_res_complete(),
        employment=_emp_complete(),
        assets_liabilities=_assets_complete(),
        loan_property=_loan_property_complete(),
        declarations=_declarations_complete(),
        acknowledgments=_acknowledgments_complete(),
        military_service=_military_complete(),
        demographics=_demographics_complete(),
    )


async def _create_audit(
    db: AsyncSession,
    loan_id: str,
    user_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
    before_value: Optional[dict] = None,
    after_value: Optional[dict] = None,
    request: Optional[Request] = None,
) -> None:
    audit = AuditLog(
        loan_id=loan_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before_value=before_value,
        after_value=after_value,
        ip_address=request.client.host if request and request.client else None,
    )
    db.add(audit)


# ---------------------------------------------------------------------------
# Progress endpoint
# ---------------------------------------------------------------------------

@router.get(
    "/{loan_id}/urla/progress",
    response_model=URLAProgress,
    status_code=status.HTTP_200_OK,
)
async def get_urla_progress(
    loan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> URLAProgress:
    """Return URLA section completion status for the primary borrower."""
    loan = await _get_loan_or_404(loan_id, db)

    result = await db.execute(
        select(Borrower).where(
            Borrower.loan_id == loan_id,
            Borrower.borrower_classification == "Primary",
        )
    )
    borrower = result.scalar_one_or_none()
    if borrower is None:
        # Return all not-started if no borrowers yet
        return URLAProgress()

    return _compute_urla_progress(borrower, loan)


# ---------------------------------------------------------------------------
# Borrower creation
# ---------------------------------------------------------------------------

@router.post(
    "/{loan_id}/borrowers",
    response_model=BorrowerResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_borrower(
    loan_id: UUID,
    payload: BorrowerCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> BorrowerResponse:
    """Create a borrower (Primary or CoBorrower) for a loan."""
    await _get_loan_or_404(loan_id, db)

    borrower = Borrower(
        loan_id=loan_id,
        borrower_classification=payload.borrower_classification,
        first_name=payload.first_name,
        last_name=payload.last_name,
        middle_name=payload.middle_name,
        email=payload.email,
        phone=payload.phone,
    )
    db.add(borrower)
    await db.flush()

    await _create_audit(
        db=db,
        loan_id=loan_id,
        user_id=current_user.id,
        action="borrower.created",
        entity_type="borrower",
        entity_id=borrower.id,
        after_value={
            "first_name": payload.first_name,
            "last_name": payload.last_name,
            "email": payload.email,
            "borrower_classification": payload.borrower_classification,
        },
        request=request,
    )

    await db.commit()
    await db.refresh(borrower)
    return BorrowerResponse.model_validate(borrower)


# ---------------------------------------------------------------------------
# Full borrower data
# ---------------------------------------------------------------------------

@router.get(
    "/{loan_id}/borrowers/{borrower_id}/urla",
    response_model=FullBorrowerResponse,
    status_code=status.HTTP_200_OK,
)
async def get_full_borrower(
    loan_id: str,
    borrower_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> FullBorrowerResponse:
    """Return full URLA data for a borrower."""
    await _get_loan_or_404(loan_id, db)
    borrower = await _get_borrower_or_404(loan_id, borrower_id, db)
    return FullBorrowerResponse.model_validate(borrower)


# ---------------------------------------------------------------------------
# Personal Info
# ---------------------------------------------------------------------------

@router.patch(
    "/{loan_id}/borrowers/{borrower_id}/personal-info",
    response_model=BorrowerResponse,
    status_code=status.HTTP_200_OK,
)
async def update_personal_info(
    loan_id: str,
    borrower_id: str,
    payload: BorrowerPersonalInfoUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> BorrowerResponse:
    """Update borrower personal information fields."""
    await _get_loan_or_404(loan_id, db)
    borrower = await _get_borrower_or_404(loan_id, borrower_id, db)

    before_snapshot: dict = {}
    update_data = payload.model_dump(exclude_none=True)

    for field, new_value in update_data.items():
        current_value = getattr(borrower, field, None)
        before_snapshot[field] = str(current_value) if current_value is not None else None
        setattr(borrower, field, new_value)

    if update_data:
        await _create_audit(
            db=db,
            loan_id=loan_id,
            user_id=current_user.id,
            action="borrower.personal_info.updated",
            entity_type="borrower",
            entity_id=borrower_id,
            before_value=before_snapshot,
            after_value={k: str(v) if v is not None else None for k, v in update_data.items()},
            request=request,
        )

    await db.commit()
    await db.refresh(borrower)
    return BorrowerResponse.model_validate(borrower)


# ---------------------------------------------------------------------------
# Residences
# ---------------------------------------------------------------------------

@router.get(
    "/{loan_id}/borrowers/{borrower_id}/residences",
    response_model=List[ResidenceResponse],
    status_code=status.HTTP_200_OK,
)
async def list_residences(
    loan_id: str,
    borrower_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[ResidenceResponse]:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)
    result = await db.execute(
        select(BorrowerResidence).where(BorrowerResidence.borrower_id == borrower_id)
    )
    residences = result.scalars().all()
    return [ResidenceResponse.model_validate(r) for r in residences]


@router.post(
    "/{loan_id}/borrowers/{borrower_id}/residences",
    response_model=ResidenceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_residence(
    loan_id: str,
    borrower_id: str,
    payload: ResidenceCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ResidenceResponse:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    residence = BorrowerResidence(borrower_id=borrower_id, **payload.model_dump())
    db.add(residence)
    await db.flush()

    await _create_audit(
        db=db,
        loan_id=loan_id,
        user_id=current_user.id,
        action="borrower.residence.created",
        entity_type="borrower_residence",
        entity_id=residence.id,
        after_value={"borrower_id": str(borrower_id), "type": payload.residency_type.value},
        request=request,
    )

    await db.commit()
    await db.refresh(residence)
    return ResidenceResponse.model_validate(residence)


@router.patch(
    "/{loan_id}/borrowers/{borrower_id}/residences/{residence_id}",
    response_model=ResidenceResponse,
    status_code=status.HTTP_200_OK,
)
async def update_residence(
    loan_id: str,
    borrower_id: str,
    residence_id: str,
    payload: ResidenceUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ResidenceResponse:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    result = await db.execute(
        select(BorrowerResidence).where(
            BorrowerResidence.id == residence_id,
            BorrowerResidence.borrower_id == borrower_id,
        )
    )
    residence = result.scalar_one_or_none()
    if residence is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Residence not found.")

    before_snapshot: dict = {}
    update_data = payload.model_dump(exclude_none=True)
    for field, new_value in update_data.items():
        current_value = getattr(residence, field, None)
        before_snapshot[field] = str(current_value) if current_value is not None else None
        setattr(residence, field, new_value)

    if update_data:
        await _create_audit(
            db=db,
            loan_id=loan_id,
            user_id=current_user.id,
            action="borrower.residence.updated",
            entity_type="borrower_residence",
            entity_id=residence_id,
            before_value=before_snapshot,
            after_value={k: str(v) if v is not None else None for k, v in update_data.items()},
            request=request,
        )

    await db.commit()
    await db.refresh(residence)
    return ResidenceResponse.model_validate(residence)


@router.delete(
    "/{loan_id}/borrowers/{borrower_id}/residences/{residence_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_residence(
    loan_id: str,
    borrower_id: str,
    residence_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    result = await db.execute(
        select(BorrowerResidence).where(
            BorrowerResidence.id == residence_id,
            BorrowerResidence.borrower_id == borrower_id,
        )
    )
    residence = result.scalar_one_or_none()
    if residence is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Residence not found.")

    await _create_audit(
        db=db,
        loan_id=loan_id,
        user_id=current_user.id,
        action="borrower.residence.deleted",
        entity_type="borrower_residence",
        entity_id=residence_id,
        request=request,
    )

    await db.delete(residence)
    await db.commit()


# ---------------------------------------------------------------------------
# Employment
# ---------------------------------------------------------------------------

@router.get(
    "/{loan_id}/borrowers/{borrower_id}/employments",
    response_model=List[EmploymentResponse],
    status_code=status.HTTP_200_OK,
)
async def list_employments(
    loan_id: str,
    borrower_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[EmploymentResponse]:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)
    result = await db.execute(
        select(BorrowerEmployment).where(BorrowerEmployment.borrower_id == borrower_id)
    )
    employments = result.scalars().all()
    return [EmploymentResponse.model_validate(e) for e in employments]


@router.post(
    "/{loan_id}/borrowers/{borrower_id}/employments",
    response_model=EmploymentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_employment(
    loan_id: str,
    borrower_id: str,
    payload: EmploymentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> EmploymentResponse:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    employment = BorrowerEmployment(borrower_id=borrower_id, **payload.model_dump())
    db.add(employment)
    await db.flush()

    await _create_audit(
        db=db,
        loan_id=loan_id,
        user_id=current_user.id,
        action="borrower.employment.created",
        entity_type="borrower_employment",
        entity_id=employment.id,
        after_value={
            "borrower_id": str(borrower_id),
            "employer": payload.employer_name,
            "status": payload.employment_status_type.value,
        },
        request=request,
    )

    await db.commit()
    await db.refresh(employment)
    return EmploymentResponse.model_validate(employment)


@router.patch(
    "/{loan_id}/borrowers/{borrower_id}/employments/{employment_id}",
    response_model=EmploymentResponse,
    status_code=status.HTTP_200_OK,
)
async def update_employment(
    loan_id: str,
    borrower_id: str,
    employment_id: str,
    payload: EmploymentUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> EmploymentResponse:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    result = await db.execute(
        select(BorrowerEmployment).where(
            BorrowerEmployment.id == employment_id,
            BorrowerEmployment.borrower_id == borrower_id,
        )
    )
    employment = result.scalar_one_or_none()
    if employment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employment not found.")

    before_snapshot: dict = {}
    update_data = payload.model_dump(exclude_none=True)
    for field, new_value in update_data.items():
        current_value = getattr(employment, field, None)
        before_snapshot[field] = str(current_value) if current_value is not None else None
        setattr(employment, field, new_value)

    if update_data:
        await _create_audit(
            db=db,
            loan_id=loan_id,
            user_id=current_user.id,
            action="borrower.employment.updated",
            entity_type="borrower_employment",
            entity_id=employment_id,
            before_value=before_snapshot,
            after_value={k: str(v) if v is not None else None for k, v in update_data.items()},
            request=request,
        )

    await db.commit()
    await db.refresh(employment)
    return EmploymentResponse.model_validate(employment)


@router.delete(
    "/{loan_id}/borrowers/{borrower_id}/employments/{employment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_employment(
    loan_id: str,
    borrower_id: str,
    employment_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    result = await db.execute(
        select(BorrowerEmployment).where(
            BorrowerEmployment.id == employment_id,
            BorrowerEmployment.borrower_id == borrower_id,
        )
    )
    employment = result.scalar_one_or_none()
    if employment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employment not found.")

    await _create_audit(
        db=db,
        loan_id=loan_id,
        user_id=current_user.id,
        action="borrower.employment.deleted",
        entity_type="borrower_employment",
        entity_id=employment_id,
        request=request,
    )

    await db.delete(employment)
    await db.commit()


# ---------------------------------------------------------------------------
# Other Income
# ---------------------------------------------------------------------------

@router.get(
    "/{loan_id}/borrowers/{borrower_id}/other-incomes",
    response_model=List[OtherIncomeResponse],
    status_code=status.HTTP_200_OK,
)
async def list_other_incomes(
    loan_id: str,
    borrower_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[OtherIncomeResponse]:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)
    result = await db.execute(
        select(BorrowerOtherIncome).where(BorrowerOtherIncome.borrower_id == borrower_id)
    )
    incomes = result.scalars().all()
    return [OtherIncomeResponse.model_validate(i) for i in incomes]


@router.post(
    "/{loan_id}/borrowers/{borrower_id}/other-incomes",
    response_model=OtherIncomeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_other_income(
    loan_id: str,
    borrower_id: str,
    payload: OtherIncomeCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> OtherIncomeResponse:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    income = BorrowerOtherIncome(borrower_id=borrower_id, **payload.model_dump())
    db.add(income)
    await db.flush()

    await _create_audit(
        db=db,
        loan_id=loan_id,
        user_id=current_user.id,
        action="borrower.other_income.created",
        entity_type="borrower_other_income",
        entity_id=income.id,
        after_value={
            "borrower_id": str(borrower_id),
            "income_type": payload.income_type.value,
            "monthly_amount": str(payload.monthly_income_amount),
        },
        request=request,
    )

    await db.commit()
    await db.refresh(income)
    return OtherIncomeResponse.model_validate(income)


@router.delete(
    "/{loan_id}/borrowers/{borrower_id}/other-incomes/{income_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_other_income(
    loan_id: str,
    borrower_id: str,
    income_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    result = await db.execute(
        select(BorrowerOtherIncome).where(
            BorrowerOtherIncome.id == income_id,
            BorrowerOtherIncome.borrower_id == borrower_id,
        )
    )
    income = result.scalar_one_or_none()
    if income is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Other income not found.")

    await _create_audit(
        db=db,
        loan_id=loan_id,
        user_id=current_user.id,
        action="borrower.other_income.deleted",
        entity_type="borrower_other_income",
        entity_id=income_id,
        request=request,
    )

    await db.delete(income)
    await db.commit()


# ---------------------------------------------------------------------------
# Assets
# ---------------------------------------------------------------------------

@router.get(
    "/{loan_id}/borrowers/{borrower_id}/assets",
    response_model=List[AssetResponse],
    status_code=status.HTTP_200_OK,
)
async def list_assets(
    loan_id: str,
    borrower_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[AssetResponse]:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)
    result = await db.execute(
        select(BorrowerAsset).where(BorrowerAsset.borrower_id == borrower_id)
    )
    assets = result.scalars().all()
    return [AssetResponse.model_validate(a) for a in assets]


@router.post(
    "/{loan_id}/borrowers/{borrower_id}/assets",
    response_model=AssetResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_asset(
    loan_id: str,
    borrower_id: str,
    payload: AssetCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> AssetResponse:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    asset = BorrowerAsset(borrower_id=borrower_id, **payload.model_dump())
    db.add(asset)
    await db.flush()

    await _create_audit(
        db=db,
        loan_id=loan_id,
        user_id=current_user.id,
        action="borrower.asset.created",
        entity_type="borrower_asset",
        entity_id=asset.id,
        after_value={
            "borrower_id": str(borrower_id),
            "asset_type": payload.asset_type.value,
            "value": str(payload.current_value_amount),
        },
        request=request,
    )

    await db.commit()
    await db.refresh(asset)
    return AssetResponse.model_validate(asset)


@router.patch(
    "/{loan_id}/borrowers/{borrower_id}/assets/{asset_id}",
    response_model=AssetResponse,
    status_code=status.HTTP_200_OK,
)
async def update_asset(
    loan_id: str,
    borrower_id: str,
    asset_id: str,
    payload: AssetUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> AssetResponse:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    result = await db.execute(
        select(BorrowerAsset).where(
            BorrowerAsset.id == asset_id,
            BorrowerAsset.borrower_id == borrower_id,
        )
    )
    asset = result.scalar_one_or_none()
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found.")

    before_snapshot: dict = {}
    update_data = payload.model_dump(exclude_none=True)
    for field, new_value in update_data.items():
        current_value = getattr(asset, field, None)
        before_snapshot[field] = str(current_value) if current_value is not None else None
        setattr(asset, field, new_value)

    if update_data:
        await _create_audit(
            db=db,
            loan_id=loan_id,
            user_id=current_user.id,
            action="borrower.asset.updated",
            entity_type="borrower_asset",
            entity_id=asset_id,
            before_value=before_snapshot,
            after_value={k: str(v) if v is not None else None for k, v in update_data.items()},
            request=request,
        )

    await db.commit()
    await db.refresh(asset)
    return AssetResponse.model_validate(asset)


@router.delete(
    "/{loan_id}/borrowers/{borrower_id}/assets/{asset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_asset(
    loan_id: str,
    borrower_id: str,
    asset_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    result = await db.execute(
        select(BorrowerAsset).where(
            BorrowerAsset.id == asset_id,
            BorrowerAsset.borrower_id == borrower_id,
        )
    )
    asset = result.scalar_one_or_none()
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found.")

    await _create_audit(
        db=db,
        loan_id=loan_id,
        user_id=current_user.id,
        action="borrower.asset.deleted",
        entity_type="borrower_asset",
        entity_id=asset_id,
        request=request,
    )

    await db.delete(asset)
    await db.commit()


# ---------------------------------------------------------------------------
# Liabilities
# ---------------------------------------------------------------------------

@router.get(
    "/{loan_id}/borrowers/{borrower_id}/liabilities",
    response_model=List[LiabilityResponse],
    status_code=status.HTTP_200_OK,
)
async def list_liabilities(
    loan_id: str,
    borrower_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[LiabilityResponse]:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)
    result = await db.execute(
        select(BorrowerLiability).where(BorrowerLiability.borrower_id == borrower_id)
    )
    liabilities = result.scalars().all()
    return [LiabilityResponse.model_validate(l) for l in liabilities]


@router.post(
    "/{loan_id}/borrowers/{borrower_id}/liabilities",
    response_model=LiabilityResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_liability(
    loan_id: str,
    borrower_id: str,
    payload: LiabilityCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> LiabilityResponse:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    liability = BorrowerLiability(borrower_id=borrower_id, **payload.model_dump())
    db.add(liability)
    await db.flush()

    await _create_audit(
        db=db,
        loan_id=loan_id,
        user_id=current_user.id,
        action="borrower.liability.created",
        entity_type="borrower_liability",
        entity_id=liability.id,
        after_value={
            "borrower_id": str(borrower_id),
            "liability_type": payload.liability_type.value,
        },
        request=request,
    )

    await db.commit()
    await db.refresh(liability)
    return LiabilityResponse.model_validate(liability)


@router.patch(
    "/{loan_id}/borrowers/{borrower_id}/liabilities/{liability_id}",
    response_model=LiabilityResponse,
    status_code=status.HTTP_200_OK,
)
async def update_liability(
    loan_id: str,
    borrower_id: str,
    liability_id: str,
    payload: LiabilityUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> LiabilityResponse:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    result = await db.execute(
        select(BorrowerLiability).where(
            BorrowerLiability.id == liability_id,
            BorrowerLiability.borrower_id == borrower_id,
        )
    )
    liability = result.scalar_one_or_none()
    if liability is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Liability not found.")

    before_snapshot: dict = {}
    update_data = payload.model_dump(exclude_none=True)
    for field, new_value in update_data.items():
        current_value = getattr(liability, field, None)
        before_snapshot[field] = str(current_value) if current_value is not None else None
        setattr(liability, field, new_value)

    if update_data:
        await _create_audit(
            db=db,
            loan_id=loan_id,
            user_id=current_user.id,
            action="borrower.liability.updated",
            entity_type="borrower_liability",
            entity_id=liability_id,
            before_value=before_snapshot,
            after_value={k: str(v) if v is not None else None for k, v in update_data.items()},
            request=request,
        )

    await db.commit()
    await db.refresh(liability)
    return LiabilityResponse.model_validate(liability)


@router.delete(
    "/{loan_id}/borrowers/{borrower_id}/liabilities/{liability_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_liability(
    loan_id: str,
    borrower_id: str,
    liability_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    result = await db.execute(
        select(BorrowerLiability).where(
            BorrowerLiability.id == liability_id,
            BorrowerLiability.borrower_id == borrower_id,
        )
    )
    liability = result.scalar_one_or_none()
    if liability is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Liability not found.")

    await _create_audit(
        db=db,
        loan_id=loan_id,
        user_id=current_user.id,
        action="borrower.liability.deleted",
        entity_type="borrower_liability",
        entity_id=liability_id,
        request=request,
    )

    await db.delete(liability)
    await db.commit()


# ---------------------------------------------------------------------------
# REO
# ---------------------------------------------------------------------------

@router.get(
    "/{loan_id}/borrowers/{borrower_id}/reo",
    response_model=List[REOResponse],
    status_code=status.HTTP_200_OK,
)
async def list_reo(
    loan_id: str,
    borrower_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[REOResponse]:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)
    result = await db.execute(
        select(RealEstateOwned).where(RealEstateOwned.borrower_id == borrower_id)
    )
    reos = result.scalars().all()
    return [REOResponse.model_validate(r) for r in reos]


@router.post(
    "/{loan_id}/borrowers/{borrower_id}/reo",
    response_model=REOResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_reo(
    loan_id: str,
    borrower_id: str,
    payload: REOCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> REOResponse:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    reo = RealEstateOwned(borrower_id=borrower_id, **payload.model_dump())
    db.add(reo)
    await db.flush()

    await _create_audit(
        db=db,
        loan_id=loan_id,
        user_id=current_user.id,
        action="borrower.reo.created",
        entity_type="real_estate_owned",
        entity_id=reo.id,
        after_value={
            "borrower_id": str(borrower_id),
            "address": payload.property_address_line,
        },
        request=request,
    )

    await db.commit()
    await db.refresh(reo)
    return REOResponse.model_validate(reo)


@router.patch(
    "/{loan_id}/borrowers/{borrower_id}/reo/{reo_id}",
    response_model=REOResponse,
    status_code=status.HTTP_200_OK,
)
async def update_reo(
    loan_id: str,
    borrower_id: str,
    reo_id: str,
    payload: REOUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> REOResponse:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    result = await db.execute(
        select(RealEstateOwned).where(
            RealEstateOwned.id == reo_id,
            RealEstateOwned.borrower_id == borrower_id,
        )
    )
    reo = result.scalar_one_or_none()
    if reo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="REO property not found.")

    before_snapshot: dict = {}
    update_data = payload.model_dump(exclude_none=True)
    for field, new_value in update_data.items():
        current_value = getattr(reo, field, None)
        before_snapshot[field] = str(current_value) if current_value is not None else None
        setattr(reo, field, new_value)

    if update_data:
        await _create_audit(
            db=db,
            loan_id=loan_id,
            user_id=current_user.id,
            action="borrower.reo.updated",
            entity_type="real_estate_owned",
            entity_id=reo_id,
            before_value=before_snapshot,
            after_value={k: str(v) if v is not None else None for k, v in update_data.items()},
            request=request,
        )

    await db.commit()
    await db.refresh(reo)
    return REOResponse.model_validate(reo)


@router.delete(
    "/{loan_id}/borrowers/{borrower_id}/reo/{reo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_reo(
    loan_id: str,
    borrower_id: str,
    reo_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    result = await db.execute(
        select(RealEstateOwned).where(
            RealEstateOwned.id == reo_id,
            RealEstateOwned.borrower_id == borrower_id,
        )
    )
    reo = result.scalar_one_or_none()
    if reo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="REO property not found.")

    await _create_audit(
        db=db,
        loan_id=loan_id,
        user_id=current_user.id,
        action="borrower.reo.deleted",
        entity_type="real_estate_owned",
        entity_id=reo_id,
        request=request,
    )

    await db.delete(reo)
    await db.commit()


# ---------------------------------------------------------------------------
# Declarations (upsert)
# ---------------------------------------------------------------------------

@router.get(
    "/{loan_id}/borrowers/{borrower_id}/declarations",
    response_model=Optional[DeclarationResponse],
    status_code=status.HTTP_200_OK,
)
async def get_declarations(
    loan_id: str,
    borrower_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Optional[DeclarationResponse]:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)
    result = await db.execute(
        select(BorrowerDeclaration).where(BorrowerDeclaration.borrower_id == borrower_id)
    )
    decl = result.scalar_one_or_none()
    if decl is None:
        return None
    return DeclarationResponse.model_validate(decl)


@router.put(
    "/{loan_id}/borrowers/{borrower_id}/declarations",
    response_model=DeclarationResponse,
    status_code=status.HTTP_200_OK,
)
async def upsert_declarations(
    loan_id: str,
    borrower_id: str,
    payload: DeclarationUpsert,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> DeclarationResponse:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    result = await db.execute(
        select(BorrowerDeclaration).where(BorrowerDeclaration.borrower_id == borrower_id)
    )
    decl = result.scalar_one_or_none()

    if decl is None:
        decl = BorrowerDeclaration(borrower_id=borrower_id, **payload.model_dump())
        db.add(decl)
        await db.flush()
        action = "borrower.declarations.created"
    else:
        update_data = payload.model_dump()
        for field, new_value in update_data.items():
            setattr(decl, field, new_value)
        action = "borrower.declarations.updated"

    await _create_audit(
        db=db,
        loan_id=loan_id,
        user_id=current_user.id,
        action=action,
        entity_type="borrower_declaration",
        entity_id=decl.id,
        request=request,
    )

    await db.commit()
    await db.refresh(decl)
    return DeclarationResponse.model_validate(decl)


# ---------------------------------------------------------------------------
# Military Service (upsert)
# ---------------------------------------------------------------------------

@router.get(
    "/{loan_id}/borrowers/{borrower_id}/military-service",
    response_model=Optional[MilitaryServiceResponse],
    status_code=status.HTTP_200_OK,
)
async def get_military_service(
    loan_id: str,
    borrower_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Optional[MilitaryServiceResponse]:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)
    result = await db.execute(
        select(BorrowerMilitaryService).where(BorrowerMilitaryService.borrower_id == borrower_id)
    )
    ms = result.scalar_one_or_none()
    if ms is None:
        return None
    return MilitaryServiceResponse.model_validate(ms)


@router.put(
    "/{loan_id}/borrowers/{borrower_id}/military-service",
    response_model=MilitaryServiceResponse,
    status_code=status.HTTP_200_OK,
)
async def upsert_military_service(
    loan_id: str,
    borrower_id: str,
    payload: MilitaryServiceUpsert,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> MilitaryServiceResponse:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    result = await db.execute(
        select(BorrowerMilitaryService).where(BorrowerMilitaryService.borrower_id == borrower_id)
    )
    ms = result.scalar_one_or_none()

    if ms is None:
        ms = BorrowerMilitaryService(borrower_id=borrower_id, **payload.model_dump())
        db.add(ms)
        await db.flush()
        action = "borrower.military_service.created"
    else:
        update_data = payload.model_dump()
        for field, new_value in update_data.items():
            setattr(ms, field, new_value)
        action = "borrower.military_service.updated"

    await _create_audit(
        db=db,
        loan_id=loan_id,
        user_id=current_user.id,
        action=action,
        entity_type="borrower_military_service",
        entity_id=ms.id,
        request=request,
    )

    await db.commit()
    await db.refresh(ms)
    return MilitaryServiceResponse.model_validate(ms)


# ---------------------------------------------------------------------------
# Demographics (upsert)
# ---------------------------------------------------------------------------

@router.get(
    "/{loan_id}/borrowers/{borrower_id}/demographics",
    response_model=Optional[DemographicsResponse],
    status_code=status.HTTP_200_OK,
)
async def get_demographics(
    loan_id: str,
    borrower_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Optional[DemographicsResponse]:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)
    result = await db.execute(
        select(BorrowerDemographics).where(BorrowerDemographics.borrower_id == borrower_id)
    )
    demo = result.scalar_one_or_none()
    if demo is None:
        return None
    return DemographicsResponse.model_validate(demo)


@router.put(
    "/{loan_id}/borrowers/{borrower_id}/demographics",
    response_model=DemographicsResponse,
    status_code=status.HTTP_200_OK,
)
async def upsert_demographics(
    loan_id: str,
    borrower_id: str,
    payload: DemographicsUpsert,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> DemographicsResponse:
    await _get_loan_or_404(loan_id, db)
    await _get_borrower_or_404(loan_id, borrower_id, db)

    result = await db.execute(
        select(BorrowerDemographics).where(BorrowerDemographics.borrower_id == borrower_id)
    )
    demo = result.scalar_one_or_none()

    if demo is None:
        demo = BorrowerDemographics(borrower_id=borrower_id, **payload.model_dump())
        db.add(demo)
        await db.flush()
        action = "borrower.demographics.created"
    else:
        update_data = payload.model_dump()
        for field, new_value in update_data.items():
            setattr(demo, field, new_value)
        action = "borrower.demographics.updated"

    await _create_audit(
        db=db,
        loan_id=loan_id,
        user_id=current_user.id,
        action=action,
        entity_type="borrower_demographics",
        entity_id=demo.id,
        request=request,
    )

    await db.commit()
    await db.refresh(demo)
    return DemographicsResponse.model_validate(demo)

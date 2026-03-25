from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_active_user, hash_password
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/users", tags=["Users"])

ASSIGNABLE_ROLES = {
    UserRole.LOAN_OFFICER,
    UserRole.PROCESSOR,
    UserRole.UNDERWRITER,
    UserRole.BRANCH_MANAGER,
}


def _require_admin(current_user: User) -> User:
    """Helper that raises 403 if the user is not an Admin."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required to access this endpoint.",
        )
    return current_user


@router.get(
    "/assignable",
    response_model=List[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="List users that can be assigned to loans",
)
async def list_assignable_users(
    role: Optional[UserRole] = Query(default=None, description="Filter to a specific role"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[UserResponse]:
    """
    Return active users with roles that can be assigned to loans
    (LoanOfficer, Processor, Underwriter, BranchManager).
    Available to any authenticated user for assignment dropdowns.
    """
    roles = {role} if role is not None else ASSIGNABLE_ROLES
    query = (
        select(User)
        .where(User.is_active.is_(True), User.role.in_(roles))
        .order_by(User.full_name)
    )
    result = await db.execute(query)
    return [UserResponse.model_validate(u) for u in result.scalars().all()]


@router.get("", response_model=List[UserResponse], status_code=status.HTTP_200_OK)
async def list_users(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    role: Optional[UserRole] = Query(default=None),
    is_active: Optional[bool] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[UserResponse]:
    """
    List all users. Admin role required.
    Supports filtering by role and is_active status.
    """
    _require_admin(current_user)

    query = select(User)
    if role is not None:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)

    query = query.order_by(User.full_name).offset(skip).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> UserResponse:
    """
    Create a new user account. Admin role required.
    The password is hashed before storage.
    """
    _require_admin(current_user)

    # Check for duplicate email
    existing = await db.execute(
        select(User.id).where(User.email == payload.email.lower())
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user with email '{payload.email}' already exists.",
        )

    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.get("/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> UserResponse:
    """
    Retrieve a single user by UUID. Admin role required (or self-lookup).
    """
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only view your own profile.",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id={user_id} not found.",
        )
    return UserResponse.model_validate(user)

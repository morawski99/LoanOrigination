import enum
from datetime import datetime
from uuid import UUID

from sqlalchemy import String, Boolean, Enum as SAEnum, DateTime, func
from sqlalchemy import String
from sqlalchemy.orm import mapped_column, MappedColumn, relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class UserRole(str, enum.Enum):
    LOAN_OFFICER = "LoanOfficer"
    PROCESSOR = "Processor"
    UNDERWRITER = "Underwriter"
    CLOSER = "Closer"
    SECONDARY_MARKETING = "SecondaryMarketing"
    BRANCH_MANAGER = "BranchManager"
    COMPLIANCE_OFFICER = "ComplianceOfficer"
    ADMIN = "Admin"


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: MappedColumn[str] = mapped_column(
        String(254),
        unique=True,
        nullable=False,
        index=True,
    )
    hashed_password: MappedColumn[str] = mapped_column(
        String(255),
        nullable=False,
    )
    full_name: MappedColumn[str] = mapped_column(
        String(255),
        nullable=False,
    )
    role: MappedColumn[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role", create_type=True),
        nullable=False,
        default=UserRole.LOAN_OFFICER,
    )
    is_active: MappedColumn[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"

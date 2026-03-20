import enum
from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import String, Numeric, Date, Boolean, Enum as SAEnum, ForeignKey
from sqlalchemy import String
from sqlalchemy.orm import mapped_column, MappedColumn, relationship, Mapped

from app.models.base import Base, UUIDMixin, TimestampMixin


class EmploymentStatusType(str, enum.Enum):
    EMPLOYED = "Employed"
    SELF_EMPLOYED = "SelfEmployed"
    RETIRED = "Retired"
    UNEMPLOYED_NOT_IN_LABOR_FORCE = "UnemployedNotInLaborForce"
    OTHER = "Other"


class BorrowerEmployment(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "borrower_employments"

    borrower_id: MappedColumn[UUID] = mapped_column(
        String(36),
        ForeignKey("borrowers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employment_status_type: MappedColumn[EmploymentStatusType] = mapped_column(
        SAEnum(EmploymentStatusType, name="employment_status_type", create_type=True),
        nullable=False,
    )
    is_current: MappedColumn[bool] = mapped_column(Boolean, nullable=False, default=True)
    employer_name: MappedColumn[Optional[str]] = mapped_column(String(200), nullable=True)
    employer_address_line: MappedColumn[Optional[str]] = mapped_column(String(200), nullable=True)
    employer_city: MappedColumn[Optional[str]] = mapped_column(String(100), nullable=True)
    employer_state: MappedColumn[Optional[str]] = mapped_column(String(2), nullable=True)
    employer_zip: MappedColumn[Optional[str]] = mapped_column(String(10), nullable=True)
    employer_phone: MappedColumn[Optional[str]] = mapped_column(String(20), nullable=True)
    position_description: MappedColumn[Optional[str]] = mapped_column(String(200), nullable=True)
    start_date: MappedColumn[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: MappedColumn[Optional[date]] = mapped_column(Date, nullable=True)
    years_in_profession: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=4, scale=1), nullable=True
    )
    is_primary: MappedColumn[bool] = mapped_column(Boolean, nullable=False, default=True)
    self_employed_indicator: MappedColumn[bool] = mapped_column(Boolean, nullable=False, default=False)
    ownership_interest_percent: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=5, scale=2), nullable=True
    )

    # Monthly income fields
    base_income_amount: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=12, scale=2), nullable=True
    )
    overtime_income_amount: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=12, scale=2), nullable=True
    )
    bonus_income_amount: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=12, scale=2), nullable=True
    )
    commission_income_amount: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=12, scale=2), nullable=True
    )
    military_entitlements_amount: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=12, scale=2), nullable=True
    )
    other_income_amount: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=12, scale=2), nullable=True
    )

    # Relationship back to borrower
    borrower: Mapped["Borrower"] = relationship(  # noqa: F821
        "Borrower",
        back_populates="employments",
    )

    def __repr__(self) -> str:
        return (
            f"<BorrowerEmployment id={self.id} borrower_id={self.borrower_id} "
            f"employer={self.employer_name} status={self.employment_status_type}>"
        )

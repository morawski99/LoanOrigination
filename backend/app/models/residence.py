import enum
from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import String, Numeric, Date, Boolean, Enum as SAEnum, ForeignKey
from sqlalchemy import String
from sqlalchemy.orm import mapped_column, MappedColumn, relationship, Mapped

from app.models.base import Base, UUIDMixin, TimestampMixin


class ResidencyType(str, enum.Enum):
    CURRENT = "Current"
    FORMER = "Former"
    MAILING = "Mailing"


class HousingExpenseType(str, enum.Enum):
    OWN = "Own"
    RENT = "Rent"
    LIVING_RENT_FREE = "LivingRentFree"
    OTHER = "Other"


class BorrowerResidence(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "borrower_residences"

    borrower_id: MappedColumn[UUID] = mapped_column(
        String(36),
        ForeignKey("borrowers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    residency_type: MappedColumn[ResidencyType] = mapped_column(
        SAEnum(ResidencyType, name="residency_type", create_type=True),
        nullable=False,
    )
    address_line: MappedColumn[str] = mapped_column(String(200), nullable=False)
    unit_number: MappedColumn[Optional[str]] = mapped_column(String(20), nullable=True)
    city: MappedColumn[str] = mapped_column(String(100), nullable=False)
    state: MappedColumn[str] = mapped_column(String(2), nullable=False)
    zip: MappedColumn[str] = mapped_column(String(10), nullable=False)
    country: MappedColumn[str] = mapped_column(String(2), nullable=False, default="US")
    housing_expense_type: MappedColumn[HousingExpenseType] = mapped_column(
        SAEnum(HousingExpenseType, name="housing_expense_type", create_type=True),
        nullable=False,
    )
    monthly_rent_amount: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=10, scale=2), nullable=True
    )
    residency_start_date: MappedColumn[Optional[date]] = mapped_column(Date, nullable=True)
    residency_end_date: MappedColumn[Optional[date]] = mapped_column(Date, nullable=True)
    is_current: MappedColumn[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationship back to borrower
    borrower: Mapped["Borrower"] = relationship(  # noqa: F821
        "Borrower",
        back_populates="residences",
    )

    def __repr__(self) -> str:
        return (
            f"<BorrowerResidence id={self.id} borrower_id={self.borrower_id} "
            f"type={self.residency_type} city={self.city}>"
        )

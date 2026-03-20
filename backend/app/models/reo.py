import enum
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import String, Numeric, Boolean, Enum as SAEnum, ForeignKey
from sqlalchemy import String
from sqlalchemy.orm import mapped_column, MappedColumn, relationship, Mapped

from app.models.base import Base, UUIDMixin, TimestampMixin


class PropertyUsageType(str, enum.Enum):
    PRIMARY_RESIDENCE = "PrimaryResidence"
    SECOND_HOME = "SecondHome"
    INVESTOR = "Investor"
    FHA_SECONDARY_RESIDENCE = "FHASecondaryResidence"


class RealEstateOwned(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "real_estate_owned"

    borrower_id: MappedColumn[UUID] = mapped_column(
        String(36),
        ForeignKey("borrowers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    property_address_line: MappedColumn[str] = mapped_column(String(200), nullable=False)
    city: MappedColumn[str] = mapped_column(String(100), nullable=False)
    state: MappedColumn[str] = mapped_column(String(2), nullable=False)
    zip: MappedColumn[str] = mapped_column(String(10), nullable=False)
    property_usage_type: MappedColumn[PropertyUsageType] = mapped_column(
        SAEnum(PropertyUsageType, name="property_usage_type", create_type=True),
        nullable=False,
    )
    pending_sale_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    monthly_rental_income_amount: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=10, scale=2), nullable=True
    )
    mortgage_liability_id: MappedColumn[Optional[UUID]] = mapped_column(
        String(36),
        ForeignKey("borrower_liabilities.id", ondelete="SET NULL"),
        nullable=True,
    )
    present_market_value_amount: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=14, scale=2), nullable=True
    )
    gross_rental_income_amount: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=10, scale=2), nullable=True
    )
    mortgage_payment_amount: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=10, scale=2), nullable=True
    )
    insurance_maintenance_taxes_amount: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=10, scale=2), nullable=True
    )
    net_rental_income_amount: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=10, scale=2), nullable=True
    )

    # Relationships
    borrower: Mapped["Borrower"] = relationship(  # noqa: F821
        "Borrower",
        back_populates="reo_properties",
    )
    mortgage_liability: Mapped[Optional["BorrowerLiability"]] = relationship(  # noqa: F821
        "BorrowerLiability",
        back_populates="reo_properties",
        foreign_keys=[mortgage_liability_id],
    )

    def __repr__(self) -> str:
        return (
            f"<RealEstateOwned id={self.id} borrower_id={self.borrower_id} "
            f"address={self.property_address_line}>"
        )

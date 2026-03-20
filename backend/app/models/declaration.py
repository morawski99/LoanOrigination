import enum
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import String, Numeric, Boolean, Enum as SAEnum, ForeignKey, UniqueConstraint
from sqlalchemy import String
from sqlalchemy.orm import mapped_column, MappedColumn, relationship, Mapped

from app.models.base import Base, UUIDMixin, TimestampMixin


class OccupancyIntentType(str, enum.Enum):
    PRIMARY_RESIDENCE = "PrimaryResidence"
    SECOND_HOME = "SecondHome"
    INVESTMENT_PROPERTY = "InvestmentProperty"


class BorrowerDeclaration(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "borrower_declarations"
    __table_args__ = (
        UniqueConstraint("borrower_id", name="uq_borrower_declarations_borrower_id"),
    )

    borrower_id: MappedColumn[UUID] = mapped_column(
        String(36),
        ForeignKey("borrowers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Part A — About this property and loan
    occupancy_intent_type: MappedColumn[Optional[OccupancyIntentType]] = mapped_column(
        SAEnum(OccupancyIntentType, name="occupancy_intent_type", create_type=True),
        nullable=True,
    )
    family_relationship_with_seller_indicator: MappedColumn[Optional[bool]] = mapped_column(
        Boolean, nullable=True
    )
    borrowed_down_payment_indicator: MappedColumn[Optional[bool]] = mapped_column(
        Boolean, nullable=True
    )
    applied_for_other_mortgage_indicator: MappedColumn[Optional[bool]] = mapped_column(
        Boolean, nullable=True
    )
    apply_new_mortgage_indicator: MappedColumn[Optional[bool]] = mapped_column(
        Boolean, nullable=True
    )

    # Part B — Finances
    outstanding_judgment_indicator: MappedColumn[Optional[bool]] = mapped_column(
        Boolean, nullable=True
    )
    declared_bankruptcy_indicator: MappedColumn[Optional[bool]] = mapped_column(
        Boolean, nullable=True
    )
    bankruptcy_type: MappedColumn[Optional[str]] = mapped_column(String(50), nullable=True)
    foreclosure_indicator: MappedColumn[Optional[bool]] = mapped_column(Boolean, nullable=True)
    party_to_lawsuit_indicator: MappedColumn[Optional[bool]] = mapped_column(
        Boolean, nullable=True
    )
    federal_debt_delinquency_indicator: MappedColumn[Optional[bool]] = mapped_column(
        Boolean, nullable=True
    )
    alimony_obligation_indicator: MappedColumn[Optional[bool]] = mapped_column(
        Boolean, nullable=True
    )
    alimony_amount: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=10, scale=2), nullable=True
    )
    co_signer_indicator: MappedColumn[Optional[bool]] = mapped_column(Boolean, nullable=True)
    us_citizen_indicator: MappedColumn[Optional[bool]] = mapped_column(Boolean, nullable=True)
    permanent_resident_alien_indicator: MappedColumn[Optional[bool]] = mapped_column(
        Boolean, nullable=True
    )
    ownership_in_past_3_years_indicator: MappedColumn[Optional[bool]] = mapped_column(
        Boolean, nullable=True
    )
    property_ownership_type: MappedColumn[Optional[str]] = mapped_column(
        String(100), nullable=True
    )

    # Relationship back to borrower
    borrower: Mapped["Borrower"] = relationship(  # noqa: F821
        "Borrower",
        back_populates="declaration",
    )

    def __repr__(self) -> str:
        return f"<BorrowerDeclaration id={self.id} borrower_id={self.borrower_id}>"

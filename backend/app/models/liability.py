import enum
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import String, Numeric, Integer, Boolean, Enum as SAEnum, ForeignKey
from sqlalchemy import String
from sqlalchemy.orm import mapped_column, MappedColumn, relationship, Mapped

from app.models.base import Base, UUIDMixin, TimestampMixin


class LiabilityType(str, enum.Enum):
    COLLECTIONS_JUDGEMENTS_AND_LIENS = "CollectionsJudgementsAndLiens"
    INSTALLMENT = "Installment"
    LEASE_PAYMENTS = "LeasePayments"
    MORTGAGE_LOAN = "MortgageLoan"
    OPEN_30_DAY_CHARGE_ACCOUNT = "Open30DayChargeAccount"
    REVOLVING = "Revolving"
    TAXES = "Taxes"
    HELOC = "HELOC"
    OTHER = "Other"


class BorrowerLiability(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "borrower_liabilities"

    borrower_id: MappedColumn[UUID] = mapped_column(
        String(36),
        ForeignKey("borrowers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    liability_type: MappedColumn[LiabilityType] = mapped_column(
        SAEnum(LiabilityType, name="liability_type", create_type=True),
        nullable=False,
    )
    creditor_name: MappedColumn[Optional[str]] = mapped_column(String(200), nullable=True)
    account_identifier: MappedColumn[Optional[str]] = mapped_column(
        String(50), nullable=True, comment="Last 4 digits only"
    )
    monthly_payment_amount: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=10, scale=2), nullable=True
    )
    unpaid_balance_amount: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=14, scale=2), nullable=True
    )
    months_remaining: MappedColumn[Optional[int]] = mapped_column(Integer, nullable=True)
    will_be_paid_off_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    exclude_from_liabilities_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    exclusion_reason: MappedColumn[Optional[str]] = mapped_column(String(200), nullable=True)

    # Relationship back to borrower
    borrower: Mapped["Borrower"] = relationship(  # noqa: F821
        "Borrower",
        back_populates="liabilities",
    )
    # REO that may reference this liability
    reo_properties: Mapped[list["RealEstateOwned"]] = relationship(  # noqa: F821
        "RealEstateOwned",
        back_populates="mortgage_liability",
        foreign_keys="RealEstateOwned.mortgage_liability_id",
    )

    def __repr__(self) -> str:
        return (
            f"<BorrowerLiability id={self.id} borrower_id={self.borrower_id} "
            f"type={self.liability_type} creditor={self.creditor_name}>"
        )

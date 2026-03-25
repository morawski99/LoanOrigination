import enum
from datetime import date
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import String, Numeric, Date, Enum as SAEnum, ForeignKey, Integer, Boolean
from sqlalchemy.orm import mapped_column, MappedColumn, relationship, Mapped

from app.models.base import Base, UUIDMixin, TimestampMixin


class LEStatus(str, enum.Enum):
    DRAFT = "Draft"
    ISSUED = "Issued"
    REVISED = "Revised"
    SUPERSEDED = "Superseded"


class RespaSection(str, enum.Enum):
    A = "A"  # Origination charges — zero tolerance
    B = "B"  # Services borrower cannot shop for — zero tolerance
    C = "C"  # Services borrower can shop for — 10% tolerance
    E = "E"  # Taxes and other government fees — zero tolerance (recording fees)
    F = "F"  # Prepaids — unlimited tolerance
    G = "G"  # Initial escrow payment at closing — unlimited tolerance
    H = "H"  # Other — unlimited tolerance


class ToleranceCategory(str, enum.Enum):
    ZERO = "Zero"
    TEN_PERCENT = "TenPercent"
    UNLIMITED = "Unlimited"


class PaidBy(str, enum.Enum):
    BORROWER = "Borrower"
    SELLER = "Seller"
    LENDER = "Lender"
    OTHER = "Other"


class COCReason(str, enum.Enum):
    ACTS_OF_GOD = "ActsOfGod"
    BORROWER_REQUESTED = "BorrowerRequested"
    RATE_LOCK = "RateLock"
    NEW_INFORMATION = "NewInformation"
    CREDIT_DENIAL = "CreditDenial"
    DELAYED_SETTLEMENT = "DelayedSettlement"


# Tolerance assignment by RESPA section
SECTION_TOLERANCE: dict[str, ToleranceCategory] = {
    "A": ToleranceCategory.ZERO,
    "B": ToleranceCategory.ZERO,
    "C": ToleranceCategory.TEN_PERCENT,
    "E": ToleranceCategory.ZERO,
    "F": ToleranceCategory.UNLIMITED,
    "G": ToleranceCategory.UNLIMITED,
    "H": ToleranceCategory.UNLIMITED,
}


class LoanEstimate(UUIDMixin, TimestampMixin, Base):
    """
    A TRID-compliant Loan Estimate (LE) document.
    Version-controlled per loan; version 1 is the initial LE,
    subsequent versions are revised LEs with a COC reason.
    """
    __tablename__ = "loan_estimates"

    loan_id: MappedColumn[str] = mapped_column(
        String(36),
        ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number: MappedColumn[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        comment="1 = initial LE; 2+ = revised LE",
    )
    status: MappedColumn[LEStatus] = mapped_column(
        SAEnum(LEStatus, name="le_status", create_type=True),
        nullable=False,
        default=LEStatus.DRAFT,
    )

    # Key dates
    issued_date: MappedColumn[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        comment="Date LE was issued/mailed to borrower",
    )
    delivery_date: MappedColumn[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        comment="Date borrower received/confirmed receipt of LE",
    )
    trid_deadline: MappedColumn[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        comment="Latest date LE must be delivered (3 business days from app date)",
    )

    # Revision tracking
    revision_reason: MappedColumn[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    coc_reason: MappedColumn[Optional[COCReason]] = mapped_column(
        SAEnum(COCReason, name="coc_reason", create_type=True),
        nullable=True,
    )
    supersedes_le_id: MappedColumn[Optional[str]] = mapped_column(
        String(36),
        nullable=True,
        comment="ID of the LE this version supersedes",
    )

    # Loan terms snapshot
    loan_amount: MappedColumn[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )
    loan_term_months: MappedColumn[int] = mapped_column(
        Integer,
        nullable=False,
        default=360,
        comment="e.g. 360 for 30-year fixed",
    )
    note_rate_percent: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(6, 4),
        nullable=True,
    )
    apr_percent: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(6, 4),
        nullable=True,
        comment="Calculated APR per TRID rules",
    )

    # Projected monthly payments
    monthly_principal_interest: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(12, 2),
        nullable=True,
    )
    monthly_mortgage_insurance: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(12, 2),
        nullable=True,
        default=Decimal("0.00"),
    )
    monthly_escrow_amount: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(12, 2),
        nullable=True,
        default=Decimal("0.00"),
        comment="Estimated taxes + homeowner's insurance",
    )
    total_monthly_payment: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(12, 2),
        nullable=True,
    )

    # Closing cost totals (derived from fees)
    total_loan_costs: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(14, 2),
        nullable=True,
        comment="Sections A + B + C",
    )
    total_other_costs: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(14, 2),
        nullable=True,
        comment="Sections E + F + G + H",
    )
    lender_credits: MappedColumn[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Negative cost to borrower; reduces cash to close",
    )
    total_closing_costs: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(14, 2),
        nullable=True,
        comment="Total loan costs + total other costs - lender credits",
    )

    # Cash to close
    purchase_price: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(14, 2),
        nullable=True,
    )
    down_payment: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(14, 2),
        nullable=True,
    )
    deposit: MappedColumn[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Earnest money deposit already paid",
    )
    seller_credits: MappedColumn[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    cash_to_close: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(14, 2),
        nullable=True,
    )

    # Issued by
    issued_by_id: MappedColumn[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    fees: Mapped[List["LoanEstimateFee"]] = relationship(
        "LoanEstimateFee",
        back_populates="loan_estimate",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="LoanEstimateFee.sort_order",
    )

    def __repr__(self) -> str:
        return (
            f"<LoanEstimate id={self.id} loan={self.loan_id} "
            f"v{self.version_number} status={self.status}>"
        )


class LoanEstimateFee(UUIDMixin, Base):
    """
    Individual fee line item on a Loan Estimate.
    Organized by RESPA section (A–H) with TRID tolerance category.
    """
    __tablename__ = "loan_estimate_fees"

    loan_estimate_id: MappedColumn[str] = mapped_column(
        String(36),
        ForeignKey("loan_estimates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    respa_section: MappedColumn[RespaSection] = mapped_column(
        SAEnum(RespaSection, name="respa_section", create_type=True),
        nullable=False,
    )
    fee_name: MappedColumn[str] = mapped_column(String(200), nullable=False)
    fee_amount: MappedColumn[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )
    tolerance_category: MappedColumn[ToleranceCategory] = mapped_column(
        SAEnum(ToleranceCategory, name="tolerance_category", create_type=True),
        nullable=False,
    )
    paid_by: MappedColumn[PaidBy] = mapped_column(
        SAEnum(PaidBy, name="paid_by", create_type=True),
        nullable=False,
        default=PaidBy.BORROWER,
    )
    paid_to: MappedColumn[Optional[str]] = mapped_column(
        String(200),
        nullable=True,
        comment="Payee name (e.g. 'ABC Appraisal', 'County Recorder')",
    )
    is_finance_charge: MappedColumn[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="Whether this fee is included in APR finance charge calculation",
    )
    sort_order: MappedColumn[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationship
    loan_estimate: Mapped["LoanEstimate"] = relationship(
        "LoanEstimate",
        back_populates="fees",
    )

    def __repr__(self) -> str:
        return (
            f"<LoanEstimateFee section={self.respa_section} "
            f"name={self.fee_name!r} amount={self.fee_amount}>"
        )

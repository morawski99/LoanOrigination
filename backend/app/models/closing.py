import enum
from datetime import date
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import (
    String,
    Numeric,
    Date,
    Text,
    Integer,
    Boolean,
    Enum as SAEnum,
    ForeignKey,
)
from sqlalchemy.orm import mapped_column, MappedColumn, relationship, Mapped

from app.models.base import Base, UUIDMixin, TimestampMixin
from app.models.loan_estimate import RespaSection, ToleranceCategory, PaidBy


# ── Enums ─────────────────────────────────────────────────────────────────────


class CDStatus(str, enum.Enum):
    DRAFT = "Draft"
    ISSUED = "Issued"
    REVISED = "Revised"
    SUPERSEDED = "Superseded"


class ChecklistCategory(str, enum.Enum):
    TITLE = "Title"
    INSURANCE = "Insurance"
    COMPLIANCE = "Compliance"
    FUNDING = "Funding"
    OTHER = "Other"


class ChecklistItemStatus(str, enum.Enum):
    PENDING = "Pending"
    COMPLETE = "Complete"
    NA = "NA"


class FundingStatusType(str, enum.Enum):
    NOT_READY = "NotReady"
    SCHEDULED = "Scheduled"
    FUNDED = "Funded"
    SUSPENDED = "Suspended"


# ── Closing Disclosure ────────────────────────────────────────────────────────


class ClosingDisclosure(UUIDMixin, TimestampMixin, Base):
    """
    TRID-compliant Closing Disclosure, mirrors the Loan Estimate structure.
    """

    __tablename__ = "closing_disclosures"

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
    )
    status: MappedColumn[CDStatus] = mapped_column(
        SAEnum(CDStatus, name="cd_status", create_type=True),
        nullable=False,
        default=CDStatus.DRAFT,
    )

    # Key dates
    issued_date: MappedColumn[Optional[date]] = mapped_column(Date, nullable=True)
    delivery_date: MappedColumn[Optional[date]] = mapped_column(Date, nullable=True)
    closing_date: MappedColumn[Optional[date]] = mapped_column(Date, nullable=True)
    disbursement_date: MappedColumn[Optional[date]] = mapped_column(Date, nullable=True)
    cd_delivery_deadline: MappedColumn[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        comment="Latest date CD must be delivered (3 biz days before closing)",
    )

    # Link to the LE for tolerance comparison
    linked_le_id: MappedColumn[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("loan_estimates.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Revision tracking
    revision_reason: MappedColumn[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    supersedes_cd_id: MappedColumn[Optional[str]] = mapped_column(
        String(36), nullable=True
    )

    # Loan terms snapshot
    loan_amount: MappedColumn[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False
    )
    loan_term_months: MappedColumn[int] = mapped_column(
        Integer, nullable=False, default=360
    )
    note_rate_percent: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(6, 4), nullable=True
    )
    apr_percent: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(6, 4), nullable=True
    )

    # Projected monthly payments
    monthly_principal_interest: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    monthly_mortgage_insurance: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(12, 2), nullable=True, default=Decimal("0.00")
    )
    monthly_escrow_amount: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(12, 2), nullable=True, default=Decimal("0.00")
    )
    total_monthly_payment: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(12, 2), nullable=True
    )

    # Closing cost totals
    total_loan_costs: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(14, 2), nullable=True
    )
    total_other_costs: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(14, 2), nullable=True
    )
    lender_credits: MappedColumn[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False, default=Decimal("0.00")
    )
    total_closing_costs: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(14, 2), nullable=True
    )

    # Cash to close
    purchase_price: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(14, 2), nullable=True
    )
    down_payment: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(14, 2), nullable=True
    )
    deposit: MappedColumn[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False, default=Decimal("0.00")
    )
    seller_credits: MappedColumn[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False, default=Decimal("0.00")
    )
    cash_to_close: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(14, 2), nullable=True
    )

    # Issued by
    issued_by_id: MappedColumn[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    fees: Mapped[List["ClosingDisclosureFee"]] = relationship(
        "ClosingDisclosureFee",
        back_populates="closing_disclosure",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ClosingDisclosureFee.sort_order",
    )

    def __repr__(self) -> str:
        return (
            f"<ClosingDisclosure id={self.id} loan={self.loan_id} "
            f"v{self.version_number} status={self.status}>"
        )


class ClosingDisclosureFee(UUIDMixin, Base):
    """Individual fee line item on a Closing Disclosure."""

    __tablename__ = "closing_disclosure_fees"

    closing_disclosure_id: MappedColumn[str] = mapped_column(
        String(36),
        ForeignKey("closing_disclosures.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    respa_section: MappedColumn[RespaSection] = mapped_column(
        SAEnum(RespaSection, name="respa_section", create_type=True, create_constraint=False),
        nullable=False,
    )
    fee_name: MappedColumn[str] = mapped_column(String(200), nullable=False)
    fee_amount: MappedColumn[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    tolerance_category: MappedColumn[ToleranceCategory] = mapped_column(
        SAEnum(ToleranceCategory, name="tolerance_category", create_type=True, create_constraint=False),
        nullable=False,
    )
    paid_by: MappedColumn[PaidBy] = mapped_column(
        SAEnum(PaidBy, name="paid_by", create_type=True, create_constraint=False),
        nullable=False,
        default=PaidBy.BORROWER,
    )
    paid_to: MappedColumn[Optional[str]] = mapped_column(String(200), nullable=True)
    is_finance_charge: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    sort_order: MappedColumn[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationship
    closing_disclosure: Mapped["ClosingDisclosure"] = relationship(
        "ClosingDisclosure", back_populates="fees"
    )


# ── Closing Checklist ─────────────────────────────────────────────────────────


class ClosingChecklist(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "closing_checklist"

    loan_id: MappedColumn[str] = mapped_column(
        String(36),
        ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category: MappedColumn[ChecklistCategory] = mapped_column(
        SAEnum(ChecklistCategory, name="checklist_category", create_type=True),
        nullable=False,
    )
    status: MappedColumn[ChecklistItemStatus] = mapped_column(
        SAEnum(ChecklistItemStatus, name="checklist_item_status", create_type=True),
        nullable=False,
        default=ChecklistItemStatus.PENDING,
    )
    description: MappedColumn[str] = mapped_column(String(500), nullable=False)
    due_date: MappedColumn[Optional[str]] = mapped_column(String(10), nullable=True)
    completed_date: MappedColumn[Optional[str]] = mapped_column(
        String(10), nullable=True
    )
    assigned_to: MappedColumn[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    notes: MappedColumn[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: MappedColumn[int] = mapped_column(Integer, nullable=False, default=0)

    def __repr__(self) -> str:
        return f"<ClosingChecklist id={self.id} status={self.status}>"


# ── Wire Instructions ─────────────────────────────────────────────────────────


class WireInstruction(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "wire_instructions"

    loan_id: MappedColumn[str] = mapped_column(
        String(36),
        ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    beneficiary_name: MappedColumn[str] = mapped_column(String(200), nullable=False)
    beneficiary_address: MappedColumn[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    bank_name: MappedColumn[str] = mapped_column(String(200), nullable=False)
    aba_routing_number: MappedColumn[str] = mapped_column(String(9), nullable=False)
    account_number: MappedColumn[str] = mapped_column(String(34), nullable=False)
    reference_number: MappedColumn[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    special_instructions: MappedColumn[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    verified: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    verified_by_id: MappedColumn[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    def __repr__(self) -> str:
        return f"<WireInstruction id={self.id} loan={self.loan_id}>"


# ── Funding Status ────────────────────────────────────────────────────────────


class FundingStatus(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "funding_status"

    loan_id: MappedColumn[str] = mapped_column(
        String(36),
        ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    status: MappedColumn[FundingStatusType] = mapped_column(
        SAEnum(FundingStatusType, name="funding_status_type", create_type=True),
        nullable=False,
        default=FundingStatusType.NOT_READY,
    )
    scheduled_date: MappedColumn[Optional[date]] = mapped_column(Date, nullable=True)
    funded_date: MappedColumn[Optional[date]] = mapped_column(Date, nullable=True)
    funded_amount: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(14, 2), nullable=True
    )
    confirmation_number: MappedColumn[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    funding_source: MappedColumn[Optional[str]] = mapped_column(
        String(200), nullable=True
    )
    notes: MappedColumn[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<FundingStatus id={self.id} loan={self.loan_id} status={self.status}>"

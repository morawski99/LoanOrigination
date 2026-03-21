import enum
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from sqlalchemy import String, Numeric, Date, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy import String, JSON
from sqlalchemy.orm import mapped_column, MappedColumn, relationship, Mapped

from app.models.base import Base, UUIDMixin, TimestampMixin


class LoanStatus(str, enum.Enum):
    NEW = "New"
    IN_PROCESS = "InProcess"
    CONDITIONAL_APPROVAL = "ConditionalApproval"
    APPROVED = "Approved"
    SUSPENDED = "Suspended"
    DECLINED = "Declined"
    WITHDRAWN = "Withdrawn"
    FUNDED = "Funded"


class LoanPurposeType(str, enum.Enum):
    PURCHASE = "Purchase"
    REFINANCE = "Refinance"
    CASH_OUT_REFINANCE = "CashOutRefinance"
    CONSTRUCTION_TO_PERMANENT = "ConstructionToPermanent"


class LoanType(str, enum.Enum):
    CONVENTIONAL = "Conventional"
    FHA = "FHA"
    VA = "VA"
    USDA = "USDA"


class Loan(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "loans"

    loan_number: MappedColumn[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
    )
    status: MappedColumn[LoanStatus] = mapped_column(
        SAEnum(LoanStatus, name="loan_status", create_type=True),
        nullable=False,
        default=LoanStatus.NEW,
        index=True,
    )
    loan_purpose_type: MappedColumn[LoanPurposeType] = mapped_column(
        SAEnum(LoanPurposeType, name="loan_purpose_type", create_type=True),
        nullable=False,
    )
    loan_type: MappedColumn[LoanType] = mapped_column(
        SAEnum(LoanType, name="loan_type", create_type=True),
        nullable=False,
    )

    # Financial
    loan_amount: MappedColumn[Decimal] = mapped_column(
        Numeric(precision=14, scale=2),
        nullable=False,
    )
    note_rate_percent: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=6, scale=4),
        nullable=True,
    )

    # Property
    property_address_line: MappedColumn[str] = mapped_column(
        String(200),
        nullable=False,
    )
    property_city: MappedColumn[str] = mapped_column(
        String(100),
        nullable=False,
    )
    property_state: MappedColumn[str] = mapped_column(
        String(2),
        nullable=False,
    )
    property_zip: MappedColumn[str] = mapped_column(
        String(10),
        nullable=False,
    )
    property_county: MappedColumn[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    # User assignments
    created_by_id: MappedColumn[UUID] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    assigned_lo_id: MappedColumn[Optional[UUID]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    assigned_processor_id: MappedColumn[Optional[UUID]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    assigned_underwriter_id: MappedColumn[Optional[UUID]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # MISMO 3.4 structured data (stores full XML-equivalent as JSON)
    mismo_data: MappedColumn[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )

    # Tracks when the loan last changed status — used to compute days_in_status
    status_changed_at: MappedColumn[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Key dates
    application_received_date: MappedColumn[Optional[date]] = mapped_column(
        Date,
        nullable=True,
    )
    estimated_close_date: MappedColumn[Optional[date]] = mapped_column(
        Date,
        nullable=True,
    )

    # Relationships
    borrowers: Mapped[List["Borrower"]] = relationship(  # noqa: F821
        "Borrower",
        back_populates="loan",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    documents: Mapped[List["Document"]] = relationship(  # noqa: F821
        "Document",
        back_populates="loan",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    aus_results: Mapped[List["AUSResult"]] = relationship(  # noqa: F821
        "AUSResult",
        back_populates="loan",
        cascade="all, delete-orphan",
        lazy="select",
        order_by="AUSResult.run_at.desc()",
    )

    def __repr__(self) -> str:
        return f"<Loan id={self.id} number={self.loan_number} status={self.status}>"

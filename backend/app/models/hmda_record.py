import enum
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    String,
    Numeric,
    Date,
    DateTime,
    Integer,
    Enum as SAEnum,
    ForeignKey,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import mapped_column, MappedColumn, relationship, Mapped

from app.models.base import Base, UUIDMixin, TimestampMixin


class HMDAActionTaken(str, enum.Enum):
    ORIGINATED = "1"           # Loan originated
    APPROVED_NOT_ACCEPTED = "2"  # Approved but not accepted
    DENIED = "3"               # Application denied
    WITHDRAWN = "4"            # Application withdrawn by applicant
    INCOMPLETE = "5"           # File closed for incompleteness
    PURCHASED = "6"            # Loan purchased by institution
    PREAPPROVAL_DENIED = "7"   # Preapproval request denied
    PREAPPROVAL_APPROVED = "8"  # Preapproval request approved but not accepted


class HMDADenialReason(str, enum.Enum):
    DEBT_TO_INCOME = "1"           # Debt-to-income ratio
    EMPLOYMENT_HISTORY = "2"        # Employment history
    CREDIT_HISTORY = "3"            # Credit history
    COLLATERAL = "4"                # Collateral
    INSUFFICIENT_CASH = "5"         # Insufficient cash (downpayment, closing costs)
    UNVERIFIABLE_INFO = "6"         # Unverifiable information
    CREDIT_APP_INCOMPLETE = "7"     # Credit application incomplete
    MI_DENIED = "8"                 # Mortgage insurance denied
    OTHER = "9"                     # Other


class HMDAValidationStatus(str, enum.Enum):
    PENDING = "Pending"
    VALID = "Valid"
    ERRORS = "Errors"
    WARNINGS = "Warnings"


class HMDARecord(UUIDMixin, TimestampMixin, Base):
    """
    HMDA LAR (Loan Application Register) record.
    One record per loan, auto-populated from loan data and
    validated before annual CFPB filing.
    """
    __tablename__ = "hmda_records"
    __table_args__ = (
        UniqueConstraint("loan_id", name="uq_hmda_records_loan_id"),
    )

    loan_id: MappedColumn[str] = mapped_column(
        String(36),
        ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Activity year (reporting year)
    activity_year: MappedColumn[int] = mapped_column(Integer, nullable=False)

    # LEI (Legal Entity Identifier) of lender — 20 chars
    lei: MappedColumn[Optional[str]] = mapped_column(String(20), nullable=True)

    # Universal Loan Identifier (ULI) — up to 45 chars
    uli: MappedColumn[Optional[str]] = mapped_column(String(45), nullable=True)

    # Action taken
    action_taken: MappedColumn[Optional[HMDAActionTaken]] = mapped_column(
        SAEnum(HMDAActionTaken, name="hmda_action_taken", create_type=True),
        nullable=True,
    )
    action_taken_date: MappedColumn[Optional[date]] = mapped_column(Date, nullable=True)

    # Denial reasons (up to 4)
    denial_reason_1: MappedColumn[Optional[HMDADenialReason]] = mapped_column(
        SAEnum(HMDADenialReason, name="hmda_denial_reason", create_type=True),
        nullable=True,
    )
    denial_reason_2: MappedColumn[Optional[HMDADenialReason]] = mapped_column(
        SAEnum(HMDADenialReason, name="hmda_denial_reason", create_type=False),
        nullable=True,
    )
    denial_reason_3: MappedColumn[Optional[HMDADenialReason]] = mapped_column(
        SAEnum(HMDADenialReason, name="hmda_denial_reason", create_type=False),
        nullable=True,
    )
    denial_reason_4: MappedColumn[Optional[HMDADenialReason]] = mapped_column(
        SAEnum(HMDADenialReason, name="hmda_denial_reason", create_type=False),
        nullable=True,
    )

    # Loan/application fields (snapshot from loan)
    loan_purpose: MappedColumn[Optional[str]] = mapped_column(String(2), nullable=True)
    loan_type: MappedColumn[Optional[str]] = mapped_column(String(2), nullable=True)
    loan_amount: MappedColumn[Optional[Decimal]] = mapped_column(Numeric(14, 2), nullable=True)
    interest_rate: MappedColumn[Optional[Decimal]] = mapped_column(Numeric(6, 4), nullable=True)
    rate_spread: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(6, 4), nullable=True,
        comment="Difference between APR and APOR for HOEPA testing",
    )
    hoepa_status: MappedColumn[Optional[str]] = mapped_column(
        String(2), nullable=True,
        comment="1=High cost, 2=Not high cost, 3=Not applicable",
    )
    lien_status: MappedColumn[Optional[str]] = mapped_column(
        String(2), nullable=True,
        comment="1=First, 2=Subordinate",
    )
    loan_term_months: MappedColumn[Optional[int]] = mapped_column(Integer, nullable=True)

    # Property fields
    property_type: MappedColumn[Optional[str]] = mapped_column(
        String(2), nullable=True,
        comment="1=SFR, 2=Manufactured, 3=Multi-family",
    )
    occupancy_type: MappedColumn[Optional[str]] = mapped_column(
        String(2), nullable=True,
        comment="1=Primary, 2=Second, 3=Investment",
    )
    property_state: MappedColumn[Optional[str]] = mapped_column(String(2), nullable=True)
    property_county: MappedColumn[Optional[str]] = mapped_column(String(100), nullable=True)
    census_tract: MappedColumn[Optional[str]] = mapped_column(
        String(11), nullable=True,
        comment="11-digit census tract for CRA/HMDA geocoding",
    )

    # Applicant demographics (summarized from borrower demographics)
    applicant_ethnicity: MappedColumn[Optional[str]] = mapped_column(String(5), nullable=True)
    applicant_race: MappedColumn[Optional[str]] = mapped_column(String(5), nullable=True)
    applicant_sex: MappedColumn[Optional[str]] = mapped_column(String(2), nullable=True)
    co_applicant_ethnicity: MappedColumn[Optional[str]] = mapped_column(String(5), nullable=True)
    co_applicant_race: MappedColumn[Optional[str]] = mapped_column(String(5), nullable=True)
    co_applicant_sex: MappedColumn[Optional[str]] = mapped_column(String(2), nullable=True)

    # Income
    applicant_income: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(14, 2), nullable=True,
        comment="Gross annual income in thousands",
    )

    # DTI
    dti_ratio: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(6, 2), nullable=True,
    )

    # Combined LTV
    combined_ltv: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(6, 2), nullable=True,
    )

    # Validation
    validation_status: MappedColumn[HMDAValidationStatus] = mapped_column(
        SAEnum(HMDAValidationStatus, name="hmda_validation_status", create_type=True),
        nullable=False,
        default=HMDAValidationStatus.PENDING,
    )
    validation_errors: MappedColumn[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="JSON array of validation error messages",
    )

    # Timestamps
    application_date: MappedColumn[Optional[date]] = mapped_column(Date, nullable=True)

    # Relationship
    loan: Mapped["Loan"] = relationship("Loan")  # noqa: F821

    def __repr__(self) -> str:
        return (
            f"<HMDARecord id={self.id} loan={self.loan_id} "
            f"action={self.action_taken} status={self.validation_status}>"
        )

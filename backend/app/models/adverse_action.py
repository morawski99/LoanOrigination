import enum
from datetime import date, datetime
from typing import Optional

from sqlalchemy import String, Date, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.orm import mapped_column, MappedColumn, relationship, Mapped

from app.models.base import Base, UUIDMixin, TimestampMixin


class AdverseActionType(str, enum.Enum):
    DENIAL = "Denial"
    COUNTEROFFER_DECLINED = "CounterofferDeclined"
    WITHDRAWAL_AFTER_COUNTEROFFER = "WithdrawalAfterCounteroffer"
    INCOMPLETE_APPLICATION = "IncompleteApplication"


class AdverseActionReasonCode(str, enum.Enum):
    """ECOA / FFIEC standard reason codes."""
    CREDIT_APPLICATION_INCOMPLETE = "CreditApplicationIncomplete"
    INSUFFICIENT_CREDIT_REFERENCES = "InsufficientCreditReferences"
    UNABLE_TO_VERIFY_CREDIT = "UnableToVerifyCredit"
    TEMPORARY_OR_IRREGULAR_EMPLOYMENT = "TemporaryOrIrregularEmployment"
    UNABLE_TO_VERIFY_EMPLOYMENT = "UnableToVerifyEmployment"
    UNABLE_TO_VERIFY_INCOME = "UnableToVerifyIncome"
    EXCESSIVE_OBLIGATIONS = "ExcessiveObligations"
    INSUFFICIENT_INCOME = "InsufficientIncome"
    INADEQUATE_COLLATERAL = "InadequateCollateral"
    CREDIT_HISTORY_DELINQUENT = "CreditHistoryDelinquent"
    INSUFFICIENT_LENGTH_EMPLOYMENT = "InsufficientLengthEmployment"
    INSUFFICIENT_LENGTH_RESIDENCE = "InsufficientLengthResidence"
    TOO_MANY_RECENT_INQUIRIES = "TooManyRecentInquiries"
    BANKRUPTCY = "Bankruptcy"
    GARNISHMENT_ATTACHMENT = "GarnishmentAttachment"
    FORECLOSURE_REPOSSESSION = "ForeclosureRepossession"
    UNACCEPTABLE_APPRAISAL = "UnacceptableAppraisal"
    MI_DENIED = "MortgageInsuranceDenied"
    OTHER = "Other"


class AdverseActionStatus(str, enum.Enum):
    DRAFT = "Draft"
    PENDING_REVIEW = "PendingReview"
    SENT = "Sent"
    ACKNOWLEDGED = "Acknowledged"


class AdverseActionNotice(UUIDMixin, TimestampMixin, Base):
    """
    ECOA Regulation B adverse action notice tracking.
    30-day notice requirement from complete application / credit decision.
    """
    __tablename__ = "adverse_action_notices"

    loan_id: MappedColumn[str] = mapped_column(
        String(36),
        ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action_type: MappedColumn[AdverseActionType] = mapped_column(
        SAEnum(AdverseActionType, name="adverse_action_type", create_type=True),
        nullable=False,
    )
    status: MappedColumn[AdverseActionStatus] = mapped_column(
        SAEnum(AdverseActionStatus, name="adverse_action_status", create_type=True),
        nullable=False,
        default=AdverseActionStatus.DRAFT,
    )

    # ECOA reason codes (up to 4)
    reason_code_1: MappedColumn[Optional[AdverseActionReasonCode]] = mapped_column(
        SAEnum(AdverseActionReasonCode, name="adverse_action_reason_code", create_type=True),
        nullable=True,
    )
    reason_code_2: MappedColumn[Optional[AdverseActionReasonCode]] = mapped_column(
        SAEnum(AdverseActionReasonCode, name="adverse_action_reason_code", create_type=False),
        nullable=True,
    )
    reason_code_3: MappedColumn[Optional[AdverseActionReasonCode]] = mapped_column(
        SAEnum(AdverseActionReasonCode, name="adverse_action_reason_code", create_type=False),
        nullable=True,
    )
    reason_code_4: MappedColumn[Optional[AdverseActionReasonCode]] = mapped_column(
        SAEnum(AdverseActionReasonCode, name="adverse_action_reason_code", create_type=False),
        nullable=True,
    )

    # Dates
    decision_date: MappedColumn[date] = mapped_column(Date, nullable=False)
    notice_deadline: MappedColumn[date] = mapped_column(
        Date, nullable=False,
        comment="30 calendar days from decision per ECOA Reg B",
    )
    sent_date: MappedColumn[Optional[date]] = mapped_column(Date, nullable=True)

    # Method of delivery
    delivery_method: MappedColumn[Optional[str]] = mapped_column(
        String(50), nullable=True,
        comment="Mail, Email, InPerson, Electronic",
    )

    # Additional notes
    notes: MappedColumn[Optional[str]] = mapped_column(Text, nullable=True)

    # Created/sent by
    created_by_id: MappedColumn[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    sent_by_id: MappedColumn[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    loan: Mapped["Loan"] = relationship("Loan")  # noqa: F821

    def __repr__(self) -> str:
        return (
            f"<AdverseActionNotice id={self.id} loan={self.loan_id} "
            f"type={self.action_type} status={self.status}>"
        )

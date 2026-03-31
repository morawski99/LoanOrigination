import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.orm import mapped_column, MappedColumn, relationship, Mapped

from app.models.base import Base, UUIDMixin, TimestampMixin


class UnderwritingDecisionType(str, enum.Enum):
    APPROVED = "Approved"
    CONDITIONAL_APPROVAL = "ConditionalApproval"
    SUSPENDED = "Suspended"
    DECLINED = "Declined"


class UnderwritingDecision(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "underwriting_decisions"

    loan_id: MappedColumn[str] = mapped_column(
        String(36),
        ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    decision_type: MappedColumn[UnderwritingDecisionType] = mapped_column(
        SAEnum(
            UnderwritingDecisionType,
            name="underwriting_decision_type",
            create_type=True,
        ),
        nullable=False,
    )
    decided_by_id: MappedColumn[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    notes: MappedColumn[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    decided_at: MappedColumn[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    # Relationships
    loan: Mapped["Loan"] = relationship("Loan")  # noqa: F821

    def __repr__(self) -> str:
        return (
            f"<UnderwritingDecision id={self.id} loan={self.loan_id} "
            f"type={self.decision_type}>"
        )

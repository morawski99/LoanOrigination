import enum
from typing import Optional

from sqlalchemy import String, Date, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.orm import mapped_column, MappedColumn, relationship, Mapped

from app.models.base import Base, UUIDMixin, TimestampMixin


class ConditionType(str, enum.Enum):
    PTA = "PTA"  # Prior to Approval
    PTD = "PTD"  # Prior to Docs
    PTF = "PTF"  # Prior to Funding


class ConditionStatus(str, enum.Enum):
    OPEN = "Open"
    CLEARED = "Cleared"
    WAIVED = "Waived"


class Condition(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "conditions"

    loan_id: MappedColumn[str] = mapped_column(
        String(36),
        ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    condition_type: MappedColumn[ConditionType] = mapped_column(
        SAEnum(ConditionType, name="condition_type", create_type=True),
        nullable=False,
        index=True,
    )
    status: MappedColumn[ConditionStatus] = mapped_column(
        SAEnum(ConditionStatus, name="condition_status", create_type=True),
        nullable=False,
        default=ConditionStatus.OPEN,
    )
    description: MappedColumn[str] = mapped_column(
        Text,
        nullable=False,
    )
    due_date: MappedColumn[Optional[str]] = mapped_column(
        String(10),  # ISO date string YYYY-MM-DD
        nullable=True,
    )
    assigned_to: MappedColumn[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    created_by_id: MappedColumn[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    loan: Mapped["Loan"] = relationship("Loan", back_populates="conditions")  # noqa: F821

    def __repr__(self) -> str:
        return (
            f"<Condition id={self.id} loan={self.loan_id} "
            f"type={self.condition_type} status={self.status}>"
        )

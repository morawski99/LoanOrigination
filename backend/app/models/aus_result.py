import enum
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from sqlalchemy import String, Numeric, Integer, JSON, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.orm import mapped_column, MappedColumn, relationship, Mapped

from app.models.base import Base, UUIDMixin, TimestampMixin


class AUSSystem(str, enum.Enum):
    DU = "DU"    # Desktop Underwriter (Fannie Mae)
    LPA = "LPA"  # Loan Product Advisor (Freddie Mac)


class AUSFinding(str, enum.Enum):
    # DU findings
    APPROVE_ELIGIBLE = "Approve/Eligible"
    APPROVE_INELIGIBLE = "Approve/Ineligible"
    REFER = "Refer"
    REFER_ELIGIBLE = "Refer/Eligible"
    REFER_WITH_CAUTION = "Refer with Caution"
    OUT_OF_SCOPE = "Out of Scope"
    # LPA findings
    ACCEPT = "Accept"
    CAUTION = "Caution"
    INELIGIBLE = "Ineligible"
    # Shared
    ERROR = "Error"


class AUSResult(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "aus_results"

    loan_id: MappedColumn[str] = mapped_column(
        String(36),
        ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Submission metadata
    system: MappedColumn[AUSSystem] = mapped_column(
        SAEnum(AUSSystem, name="aus_system", create_type=True),
        nullable=False,
    )
    casefile_id: MappedColumn[str] = mapped_column(
        String(100),
        nullable=False,
    )
    submission_number: MappedColumn[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )

    # Core finding
    finding: MappedColumn[AUSFinding] = mapped_column(
        SAEnum(AUSFinding, name="aus_finding", create_type=True),
        nullable=False,
    )

    # Key underwriting terms
    max_ltv_percent: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=6, scale=3),
        nullable=True,
    )
    max_cltv_percent: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=6, scale=3),
        nullable=True,
    )
    reserves_months: MappedColumn[Optional[Decimal]] = mapped_column(
        Numeric(precision=6, scale=2),
        nullable=True,
    )
    documentation_type: MappedColumn[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    # Structured lists stored as JSON arrays
    doc_requirements: MappedColumn[Optional[list]] = mapped_column(
        JSON,
        nullable=True,
    )
    recommendations: MappedColumn[Optional[list]] = mapped_column(
        JSON,
        nullable=True,
    )

    # Narrative summary
    findings_summary: MappedColumn[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Who submitted and when
    submitted_by_id: MappedColumn[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    run_at: MappedColumn[datetime] = mapped_column(
        nullable=False,
    )

    # Full raw response payload from DU/LPA (for audit trail)
    raw_response: MappedColumn[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )

    # Relationships
    loan: Mapped["Loan"] = relationship("Loan", back_populates="aus_results")  # noqa: F821

    def __repr__(self) -> str:
        return (
            f"<AUSResult id={self.id} loan={self.loan_id} "
            f"system={self.system} finding={self.finding}>"
        )

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import String, Enum as SAEnum, ForeignKey, DateTime
from sqlalchemy import String
from sqlalchemy.orm import mapped_column, MappedColumn, relationship, Mapped

from app.models.base import Base, UUIDMixin, TimestampMixin


class DocumentStatus(str, enum.Enum):
    REQUESTED = "Requested"
    RECEIVED = "Received"
    REVIEWED = "Reviewed"
    ACCEPTED = "Accepted"
    REJECTED = "Rejected"


class Document(UUIDMixin, Base):
    """
    Metadata record for a document associated with a loan.
    The actual file is stored in S3; this table tracks the reference.
    """
    __tablename__ = "documents"

    # Core associations
    loan_id: MappedColumn[UUID] = mapped_column(
        String(36),
        ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Document info
    document_type: MappedColumn[str] = mapped_column(
        String(100),
        nullable=False,
        comment="e.g. W2, PayStub, BankStatement, TaxReturn, AppraisalReport",
    )
    document_status: MappedColumn[DocumentStatus] = mapped_column(
        SAEnum(DocumentStatus, name="document_status", create_type=True),
        nullable=False,
        default=DocumentStatus.REQUESTED,
    )

    # S3 storage
    s3_key: MappedColumn[Optional[str]] = mapped_column(
        String(512),
        nullable=True,
        comment="S3 object key for the uploaded file",
    )
    original_filename: MappedColumn[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # User tracking
    uploaded_by_id: MappedColumn[Optional[UUID]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_by_id: MappedColumn[Optional[UUID]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Timestamps
    uploaded_at: MappedColumn[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    reviewed_at: MappedColumn[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: MappedColumn[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default="now()",
    )

    # Relationships
    loan: Mapped["Loan"] = relationship(  # noqa: F821
        "Loan",
        back_populates="documents",
    )

    def __repr__(self) -> str:
        return (
            f"<Document id={self.id} type={self.document_type} "
            f"status={self.document_status}>"
        )

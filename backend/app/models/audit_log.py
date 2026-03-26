from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import String, DateTime, func
from sqlalchemy import String, JSON
from sqlalchemy.orm import mapped_column, MappedColumn

from app.models.base import Base


class AuditLog(Base):
    """
    Immutable audit trail record.
    Records every state change, access event, and action in the system.
    No `updated_at` — audit records are append-only and must never be modified.
    """
    __tablename__ = "audit_logs"

    id: MappedColumn[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    # Context
    loan_id: MappedColumn[Optional[str]] = mapped_column(
        String(36),
        nullable=True,
        index=True,
        comment="FK to loans.id — nullable for non-loan actions",
    )
    user_id: MappedColumn[Optional[str]] = mapped_column(
        String(36),
        nullable=True,
        index=True,
        comment="FK to users.id — nullable for system actions",
    )

    # Action descriptor
    action: MappedColumn[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="Dot-notation action name, e.g. 'loan.status_changed', 'document.uploaded'",
    )

    # Entity reference
    entity_type: MappedColumn[str] = mapped_column(
        String(50),
        nullable=False,
        comment="Entity type, e.g. 'loan', 'borrower', 'document'",
    )
    entity_id: MappedColumn[str] = mapped_column(
        String(36),
        nullable=False,
        comment="UUID of the affected entity",
    )

    # Change data
    before_value: MappedColumn[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        comment="JSON snapshot of the entity state before the change",
    )
    after_value: MappedColumn[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        comment="JSON snapshot of the entity state after the change",
    )

    # Request metadata
    ip_address: MappedColumn[Optional[str]] = mapped_column(
        String(45),
        nullable=True,
        comment="Client IP address (supports IPv4 and IPv6)",
    )

    # Timestamp — no updated_at (immutable records)
    created_at: MappedColumn[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    def __repr__(self) -> str:
        return (
            f"<AuditLog id={self.id} action={self.action} "
            f"entity_type={self.entity_type} entity_id={self.entity_id}>"
        )

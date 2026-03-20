from datetime import datetime
from uuid import uuid4, UUID

from sqlalchemy import DateTime, func, String
from sqlalchemy.orm import DeclarativeBase, mapped_column, MappedColumn


class Base(DeclarativeBase):
    """
    SQLAlchemy 2.0 declarative base for all ORM models.
    """
    pass


class UUIDMixin:
    """
    Provides a UUID primary key column named `id`.
    Uses String(36) for cross-database compatibility (SQLite + PostgreSQL).
    """
    id: MappedColumn[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
        index=True,
    )


class TimestampMixin:
    """
    Provides `created_at` and `updated_at` timestamp columns.
    """
    created_at: MappedColumn[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: MappedColumn[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

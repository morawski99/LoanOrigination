from datetime import date
from typing import Optional
from uuid import UUID

from sqlalchemy import String, Date, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy import String
from sqlalchemy.orm import mapped_column, MappedColumn, relationship, Mapped

from app.models.base import Base, UUIDMixin, TimestampMixin


class BorrowerMilitaryService(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "borrower_military_services"
    __table_args__ = (
        UniqueConstraint("borrower_id", name="uq_borrower_military_services_borrower_id"),
    )

    borrower_id: MappedColumn[UUID] = mapped_column(
        String(36),
        ForeignKey("borrowers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    did_serve_indicator: MappedColumn[bool] = mapped_column(Boolean, nullable=False, default=False)
    active_duty_indicator: MappedColumn[bool] = mapped_column(Boolean, nullable=False, default=False)
    retired_discharged_separated_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    surviving_spouse_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    scra_indicator: MappedColumn[bool] = mapped_column(Boolean, nullable=False, default=False)
    branch_of_service_type: MappedColumn[Optional[str]] = mapped_column(String(50), nullable=True)
    service_start_date: MappedColumn[Optional[date]] = mapped_column(Date, nullable=True)
    service_end_date: MappedColumn[Optional[date]] = mapped_column(Date, nullable=True)
    expiration_date_of_service: MappedColumn[Optional[date]] = mapped_column(Date, nullable=True)

    # Relationship back to borrower
    borrower: Mapped["Borrower"] = relationship(  # noqa: F821
        "Borrower",
        back_populates="military_service",
    )

    def __repr__(self) -> str:
        return (
            f"<BorrowerMilitaryService id={self.id} borrower_id={self.borrower_id} "
            f"did_serve={self.did_serve_indicator}>"
        )

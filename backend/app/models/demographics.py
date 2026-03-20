from typing import Optional
from uuid import UUID

from sqlalchemy import String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy import String
from sqlalchemy.orm import mapped_column, MappedColumn, relationship, Mapped

from app.models.base import Base, UUIDMixin, TimestampMixin


class BorrowerDemographics(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "borrower_demographics"
    __table_args__ = (
        UniqueConstraint("borrower_id", name="uq_borrower_demographics_borrower_id"),
    )

    borrower_id: MappedColumn[UUID] = mapped_column(
        String(36),
        ForeignKey("borrowers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Ethnicity
    ethnicity_hispanic_latino_indicator: MappedColumn[Optional[bool]] = mapped_column(
        Boolean, nullable=True
    )
    ethnicity_mexican_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    ethnicity_puerto_rican_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    ethnicity_cuban_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    ethnicity_other_hispanic_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    ethnicity_other_hispanic_description: MappedColumn[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    ethnicity_not_hispanic_indicator: MappedColumn[Optional[bool]] = mapped_column(
        Boolean, nullable=True
    )
    ethnicity_not_provided_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    # Race
    race_american_indian_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    race_american_indian_tribe_name: MappedColumn[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    race_asian_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    race_asian_indian_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    race_chinese_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    race_filipino_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    race_japanese_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    race_korean_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    race_vietnamese_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    race_other_asian_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    race_other_asian_description: MappedColumn[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    race_black_african_american_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    race_native_hawaiian_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    race_guamanian_chamorro_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    race_samoan_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    race_other_pacific_islander_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    race_other_pacific_islander_description: MappedColumn[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    race_white_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    race_not_provided_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    # Sex
    sex_male_indicator: MappedColumn[Optional[bool]] = mapped_column(Boolean, nullable=True)
    sex_female_indicator: MappedColumn[Optional[bool]] = mapped_column(Boolean, nullable=True)
    sex_not_provided_indicator: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    sex_prefer_not_to_disclose: MappedColumn[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    # Collection method
    collection_method_type: MappedColumn[Optional[str]] = mapped_column(String(50), nullable=True)

    # Relationship back to borrower
    borrower: Mapped["Borrower"] = relationship(  # noqa: F821
        "Borrower",
        back_populates="demographics",
    )

    def __repr__(self) -> str:
        return f"<BorrowerDemographics id={self.id} borrower_id={self.borrower_id}>"

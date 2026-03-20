import enum
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from sqlalchemy import String, Integer, Enum as SAEnum, ForeignKey, DateTime
from sqlalchemy import String
from sqlalchemy.orm import mapped_column, MappedColumn, relationship, Mapped

from app.models.base import Base, UUIDMixin, TimestampMixin


class BorrowerClassification(str, enum.Enum):
    PRIMARY = "Primary"
    CO_BORROWER = "CoBorrower"


class CitizenshipResidencyType(str, enum.Enum):
    US_CITIZEN = "USCitizen"
    PERMANENT_RESIDENT_ALIEN = "PermanentResidentAlien"
    NON_PERMANENT_RESIDENT_ALIEN = "NonPermanentResidentAlien"
    NON_RESIDENT_ALIEN = "NonResidentAlien"


class MaritalStatusType(str, enum.Enum):
    MARRIED = "Married"
    SEPARATED = "Separated"
    UNMARRIED = "Unmarried"


class Borrower(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "borrowers"

    loan_id: MappedColumn[UUID] = mapped_column(
        String(36),
        ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    borrower_classification: MappedColumn[BorrowerClassification] = mapped_column(
        SAEnum(BorrowerClassification, name="borrower_classification", create_type=True),
        nullable=False,
        default=BorrowerClassification.PRIMARY,
    )

    # Name
    first_name: MappedColumn[str] = mapped_column(String(100), nullable=False)
    last_name: MappedColumn[str] = mapped_column(String(100), nullable=False)
    middle_name: MappedColumn[Optional[str]] = mapped_column(String(100), nullable=True)
    suffix_name: MappedColumn[Optional[str]] = mapped_column(String(20), nullable=True)

    # PII — SSN is tokenized (not stored in plaintext)
    ssn_token: MappedColumn[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        comment="Tokenized SSN reference — never store plaintext SSN",
    )

    # Contact
    email: MappedColumn[str] = mapped_column(String(254), nullable=False)
    phone: MappedColumn[str] = mapped_column(String(20), nullable=False)
    home_phone: MappedColumn[Optional[str]] = mapped_column(String(20), nullable=True)
    work_phone: MappedColumn[Optional[str]] = mapped_column(String(20), nullable=True)

    # Encrypted DOB
    dob_encrypted: MappedColumn[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="AES-256 encrypted date of birth",
    )

    # Credit
    credit_score: MappedColumn[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )

    # URLA personal info additions
    citizenship_residency_type: MappedColumn[Optional[CitizenshipResidencyType]] = mapped_column(
        SAEnum(CitizenshipResidencyType, name="citizenship_residency_type", create_type=True),
        nullable=True,
    )
    marital_status_type: MappedColumn[Optional[MaritalStatusType]] = mapped_column(
        SAEnum(MaritalStatusType, name="marital_status_type", create_type=True),
        nullable=True,
    )
    number_of_dependents: MappedColumn[Optional[int]] = mapped_column(Integer, nullable=True)
    dependent_ages_description: MappedColumn[Optional[str]] = mapped_column(
        String(100), nullable=True, comment="e.g. '3, 7, 12'"
    )

    # Relationships
    loan: Mapped["Loan"] = relationship(  # noqa: F821
        "Loan",
        back_populates="borrowers",
    )
    residences: Mapped[List["BorrowerResidence"]] = relationship(  # noqa: F821
        "BorrowerResidence",
        back_populates="borrower",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    employments: Mapped[List["BorrowerEmployment"]] = relationship(  # noqa: F821
        "BorrowerEmployment",
        back_populates="borrower",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    other_incomes: Mapped[List["BorrowerOtherIncome"]] = relationship(  # noqa: F821
        "BorrowerOtherIncome",
        back_populates="borrower",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    assets: Mapped[List["BorrowerAsset"]] = relationship(  # noqa: F821
        "BorrowerAsset",
        back_populates="borrower",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    liabilities: Mapped[List["BorrowerLiability"]] = relationship(  # noqa: F821
        "BorrowerLiability",
        back_populates="borrower",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    reo_properties: Mapped[List["RealEstateOwned"]] = relationship(  # noqa: F821
        "RealEstateOwned",
        back_populates="borrower",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    declaration: Mapped[Optional["BorrowerDeclaration"]] = relationship(  # noqa: F821
        "BorrowerDeclaration",
        back_populates="borrower",
        cascade="all, delete-orphan",
        uselist=False,
        lazy="selectin",
    )
    military_service: Mapped[Optional["BorrowerMilitaryService"]] = relationship(  # noqa: F821
        "BorrowerMilitaryService",
        back_populates="borrower",
        cascade="all, delete-orphan",
        uselist=False,
        lazy="selectin",
    )
    demographics: Mapped[Optional["BorrowerDemographics"]] = relationship(  # noqa: F821
        "BorrowerDemographics",
        back_populates="borrower",
        cascade="all, delete-orphan",
        uselist=False,
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<Borrower id={self.id} name={self.first_name} {self.last_name} "
            f"classification={self.borrower_classification}>"
        )

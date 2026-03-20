import enum
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import String, Numeric, Enum as SAEnum, ForeignKey
from sqlalchemy import String
from sqlalchemy.orm import mapped_column, MappedColumn, relationship, Mapped

from app.models.base import Base, UUIDMixin, TimestampMixin


class OtherIncomeType(str, enum.Enum):
    ALIMONY_CHILD_SUPPORT = "AlimonyChildSupport"
    AUTOMOBILE_EXPENSE_ACCOUNT = "AutomobileExpenseAccount"
    CAPITAL_GAINS = "CapitalGains"
    DEFINED_CONTRIBUTION_PLAN = "DefinedContributionPlan"
    DISABILITY = "Disability"
    FOSTER_CARE = "FosterCare"
    HOUSING_OR_PARSONAGE = "HousingOrParsonage"
    INTEREST_DIVIDENDS = "InterestDividends"
    MORTGAGE_CREDIT_CERTIFICATE = "MortgageCreditCertificate"
    MORTGAGE_DIFFERENTIAL = "MortgageDifferential"
    NOTES_RECEIVABLE_INSTALLMENT = "NotesReceivableInstallment"
    OTHER = "Other"
    PENSION = "Pension"
    PUBLIC_ASSISTANCE = "PublicAssistance"
    RENTAL_INCOME = "RentalIncome"
    RETIREMENT_FUNDS = "RetirementFunds"
    ROYALTY_PAYMENTS = "RoyaltyPayments"
    SOCIAL_SECURITY_DISABILITY = "SocialSecurityDisability"
    SOCIAL_SECURITY_INCOME = "SocialSecurityIncome"
    TRUST_INCOME = "TrustIncome"
    VA_BENEFITS_NON_EDUCATIONAL = "VABenefitsNonEducational"


class BorrowerOtherIncome(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "borrower_other_incomes"

    borrower_id: MappedColumn[UUID] = mapped_column(
        String(36),
        ForeignKey("borrowers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    income_type: MappedColumn[OtherIncomeType] = mapped_column(
        SAEnum(OtherIncomeType, name="other_income_type", create_type=True),
        nullable=False,
    )
    monthly_income_amount: MappedColumn[Decimal] = mapped_column(
        Numeric(precision=12, scale=2), nullable=False
    )
    description: MappedColumn[Optional[str]] = mapped_column(String(200), nullable=True)

    # Relationship back to borrower
    borrower: Mapped["Borrower"] = relationship(  # noqa: F821
        "Borrower",
        back_populates="other_incomes",
    )

    def __repr__(self) -> str:
        return (
            f"<BorrowerOtherIncome id={self.id} borrower_id={self.borrower_id} "
            f"type={self.income_type} amount={self.monthly_income_amount}>"
        )

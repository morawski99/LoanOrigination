from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict, model_validator

from app.models.loan_estimate import (
    LEStatus,
    RespaSection,
    ToleranceCategory,
    PaidBy,
    COCReason,
    SECTION_TOLERANCE,
)


# ---------------------------------------------------------------------------
# Fee schemas
# ---------------------------------------------------------------------------

class LoanEstimateFeeCreate(BaseModel):
    respa_section: RespaSection
    fee_name: str = Field(min_length=1, max_length=200)
    fee_amount: Decimal = Field(ge=0, decimal_places=2)
    paid_by: PaidBy = PaidBy.BORROWER
    paid_to: Optional[str] = Field(default=None, max_length=200)
    is_finance_charge: bool = True
    sort_order: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def assign_tolerance(self) -> "LoanEstimateFeeCreate":
        """tolerance_category is always derived from respa_section."""
        return self

    @property
    def tolerance_category(self) -> ToleranceCategory:
        return SECTION_TOLERANCE[self.respa_section.value]


class LoanEstimateFeeResponse(BaseModel):
    id: UUID
    loan_estimate_id: UUID
    respa_section: RespaSection
    fee_name: str
    fee_amount: Decimal
    tolerance_category: ToleranceCategory
    paid_by: PaidBy
    paid_to: Optional[str] = None
    is_finance_charge: bool
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# LE create / update
# ---------------------------------------------------------------------------

class LoanEstimateCreate(BaseModel):
    """
    Input for creating a new draft Loan Estimate.
    Loan terms are required; fees are optional at creation time
    (can be added via the fees endpoint).
    """
    loan_term_months: int = Field(default=360, ge=60, le=480)
    note_rate_percent: Optional[Decimal] = Field(default=None, ge=0, le=30, decimal_places=4)
    monthly_mortgage_insurance: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    monthly_escrow_amount: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    purchase_price: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    deposit: Decimal = Field(default=Decimal("0.00"), ge=0, decimal_places=2)
    seller_credits: Decimal = Field(default=Decimal("0.00"), ge=0, decimal_places=2)
    lender_credits: Decimal = Field(default=Decimal("0.00"), ge=0, decimal_places=2)
    fees: List[LoanEstimateFeeCreate] = Field(default_factory=list)


class LoanEstimateUpdate(BaseModel):
    """Partial update — all fields optional."""
    note_rate_percent: Optional[Decimal] = Field(default=None, ge=0, le=30, decimal_places=4)
    loan_term_months: Optional[int] = Field(default=None, ge=60, le=480)
    monthly_mortgage_insurance: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    monthly_escrow_amount: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    purchase_price: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    deposit: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    seller_credits: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    lender_credits: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)


class FeesReplaceRequest(BaseModel):
    """Replace the full fee schedule for a draft LE."""
    fees: List[LoanEstimateFeeCreate]


class IssueRequest(BaseModel):
    """Mark a draft LE as issued."""
    issued_date: date
    delivery_date: Optional[date] = None  # defaults to issued_date + 3 days (mailbox rule)


class ReviseRequest(BaseModel):
    """Create a revised LE (supersedes the current one)."""
    coc_reason: COCReason
    revision_reason: str = Field(min_length=5, max_length=500)
    note_rate_percent: Optional[Decimal] = Field(default=None, ge=0, le=30, decimal_places=4)
    loan_term_months: Optional[int] = Field(default=None, ge=60, le=480)
    monthly_mortgage_insurance: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    monthly_escrow_amount: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    lender_credits: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    fees: List[LoanEstimateFeeCreate] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# LE response
# ---------------------------------------------------------------------------

class LoanEstimateResponse(BaseModel):
    id: UUID
    loan_id: UUID
    version_number: int
    status: LEStatus
    issued_date: Optional[date] = None
    delivery_date: Optional[date] = None
    trid_deadline: Optional[date] = None
    revision_reason: Optional[str] = None
    coc_reason: Optional[COCReason] = None
    supersedes_le_id: Optional[UUID] = None

    # Loan terms
    loan_amount: Decimal
    loan_term_months: int
    note_rate_percent: Optional[Decimal] = None
    apr_percent: Optional[Decimal] = None

    # Projected payments
    monthly_principal_interest: Optional[Decimal] = None
    monthly_mortgage_insurance: Optional[Decimal] = None
    monthly_escrow_amount: Optional[Decimal] = None
    total_monthly_payment: Optional[Decimal] = None

    # Costs
    total_loan_costs: Optional[Decimal] = None
    total_other_costs: Optional[Decimal] = None
    lender_credits: Decimal
    total_closing_costs: Optional[Decimal] = None

    # Cash to close
    purchase_price: Optional[Decimal] = None
    down_payment: Optional[Decimal] = None
    deposit: Decimal
    seller_credits: Decimal
    cash_to_close: Optional[Decimal] = None

    issued_by_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    fees: List[LoanEstimateFeeResponse] = []

    model_config = ConfigDict(from_attributes=True)


class LoanEstimateListItem(BaseModel):
    id: UUID
    loan_id: UUID
    version_number: int
    status: LEStatus
    issued_date: Optional[date] = None
    trid_deadline: Optional[date] = None
    note_rate_percent: Optional[Decimal] = None
    apr_percent: Optional[Decimal] = None
    total_closing_costs: Optional[Decimal] = None
    cash_to_close: Optional[Decimal] = None
    total_monthly_payment: Optional[Decimal] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# TRID status response
# ---------------------------------------------------------------------------

class TRIDStatusResponse(BaseModel):
    loan_id: UUID
    application_date: Optional[date]
    le_deadline: Optional[date]
    days_until_deadline: Optional[int]
    le_issued: bool
    le_issued_date: Optional[date]
    earliest_closing_date: Optional[date]
    latest_le_version: int
    tolerance_ok: bool

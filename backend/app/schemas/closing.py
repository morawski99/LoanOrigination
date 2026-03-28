from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

from app.models.closing import (
    CDStatus,
    ChecklistCategory,
    ChecklistItemStatus,
    FundingStatusType,
)
from app.models.loan_estimate import RespaSection, PaidBy


# ── Closing Disclosure Fees ───────────────────────────────────────────────────


class CDFeeCreate(BaseModel):
    respa_section: RespaSection
    fee_name: str = Field(min_length=1, max_length=200)
    fee_amount: Decimal
    paid_by: PaidBy = PaidBy.BORROWER
    paid_to: Optional[str] = Field(default=None, max_length=200)
    is_finance_charge: bool = True
    sort_order: int = 0


class CDFeeResponse(BaseModel):
    id: UUID
    closing_disclosure_id: UUID
    respa_section: RespaSection
    fee_name: str
    fee_amount: Decimal
    tolerance_category: str
    paid_by: PaidBy
    paid_to: Optional[str] = None
    is_finance_charge: bool
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


# ── Closing Disclosure ────────────────────────────────────────────────────────


class CDCreate(BaseModel):
    loan_term_months: int = 360
    note_rate_percent: Optional[Decimal] = None
    monthly_mortgage_insurance: Optional[Decimal] = Field(default=Decimal("0.00"))
    monthly_escrow_amount: Optional[Decimal] = Field(default=Decimal("0.00"))
    purchase_price: Optional[Decimal] = None
    deposit: Decimal = Decimal("0.00")
    seller_credits: Decimal = Decimal("0.00")
    lender_credits: Decimal = Decimal("0.00")
    closing_date: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    disbursement_date: Optional[str] = Field(
        default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"
    )
    fees: list[CDFeeCreate] = []


class CDUpdate(BaseModel):
    note_rate_percent: Optional[Decimal] = None
    loan_term_months: Optional[int] = None
    monthly_mortgage_insurance: Optional[Decimal] = None
    monthly_escrow_amount: Optional[Decimal] = None
    purchase_price: Optional[Decimal] = None
    deposit: Optional[Decimal] = None
    seller_credits: Optional[Decimal] = None
    lender_credits: Optional[Decimal] = None
    closing_date: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    disbursement_date: Optional[str] = Field(
        default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"
    )


class CDIssuePayload(BaseModel):
    issued_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    delivery_date: Optional[str] = Field(
        default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"
    )


class CDResponse(BaseModel):
    id: UUID
    loan_id: UUID
    version_number: int
    status: CDStatus
    issued_date: Optional[date] = None
    delivery_date: Optional[date] = None
    closing_date: Optional[date] = None
    disbursement_date: Optional[date] = None
    cd_delivery_deadline: Optional[date] = None
    linked_le_id: Optional[UUID] = None
    revision_reason: Optional[str] = None
    supersedes_cd_id: Optional[UUID] = None

    loan_amount: Decimal
    loan_term_months: int
    note_rate_percent: Optional[Decimal] = None
    apr_percent: Optional[Decimal] = None

    monthly_principal_interest: Optional[Decimal] = None
    monthly_mortgage_insurance: Optional[Decimal] = None
    monthly_escrow_amount: Optional[Decimal] = None
    total_monthly_payment: Optional[Decimal] = None

    total_loan_costs: Optional[Decimal] = None
    total_other_costs: Optional[Decimal] = None
    lender_credits: Decimal
    total_closing_costs: Optional[Decimal] = None

    purchase_price: Optional[Decimal] = None
    down_payment: Optional[Decimal] = None
    deposit: Decimal
    seller_credits: Decimal
    cash_to_close: Optional[Decimal] = None

    issued_by_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    fees: list[CDFeeResponse] = []

    model_config = ConfigDict(from_attributes=True)


class CDListItem(BaseModel):
    id: UUID
    loan_id: UUID
    version_number: int
    status: CDStatus
    issued_date: Optional[date] = None
    closing_date: Optional[date] = None
    cd_delivery_deadline: Optional[date] = None
    note_rate_percent: Optional[Decimal] = None
    apr_percent: Optional[Decimal] = None
    total_closing_costs: Optional[Decimal] = None
    cash_to_close: Optional[Decimal] = None
    total_monthly_payment: Optional[Decimal] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Tolerance Check ───────────────────────────────────────────────────────────


class ToleranceViolation(BaseModel):
    fee_name: str
    original: float
    revised: float
    increase: float


class ToleranceCheckResponse(BaseModel):
    zero_violations: list[ToleranceViolation]
    ten_pct_bucket_original: float
    ten_pct_bucket_revised: float
    ten_pct_exceeded: bool
    cure_amount: float


# ── Closing Checklist ─────────────────────────────────────────────────────────


class ChecklistItemCreate(BaseModel):
    category: ChecklistCategory
    description: str = Field(min_length=1, max_length=500)
    due_date: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    assigned_to: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=2000)
    sort_order: int = 0


class ChecklistItemUpdate(BaseModel):
    category: Optional[ChecklistCategory] = None
    status: Optional[ChecklistItemStatus] = None
    description: Optional[str] = Field(default=None, min_length=1, max_length=500)
    due_date: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    completed_date: Optional[str] = Field(
        default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"
    )
    assigned_to: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=2000)
    sort_order: Optional[int] = None


class ChecklistItemResponse(BaseModel):
    id: UUID
    loan_id: UUID
    category: ChecklistCategory
    status: ChecklistItemStatus
    description: str
    due_date: Optional[str] = None
    completed_date: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Wire Instructions ─────────────────────────────────────────────────────────


class WireInstructionUpsert(BaseModel):
    beneficiary_name: str = Field(min_length=1, max_length=200)
    beneficiary_address: Optional[str] = Field(default=None, max_length=500)
    bank_name: str = Field(min_length=1, max_length=200)
    aba_routing_number: str = Field(min_length=9, max_length=9, pattern=r"^\d{9}$")
    account_number: str = Field(min_length=1, max_length=34)
    reference_number: Optional[str] = Field(default=None, max_length=100)
    special_instructions: Optional[str] = Field(default=None, max_length=2000)


class WireInstructionResponse(BaseModel):
    id: UUID
    loan_id: UUID
    beneficiary_name: str
    beneficiary_address: Optional[str] = None
    bank_name: str
    aba_routing_number: str
    account_number: str
    reference_number: Optional[str] = None
    special_instructions: Optional[str] = None
    verified: bool
    verified_by_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Funding Status ────────────────────────────────────────────────────────────


class FundingStatusUpsert(BaseModel):
    status: FundingStatusType
    scheduled_date: Optional[str] = Field(
        default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"
    )
    funded_date: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    funded_amount: Optional[Decimal] = None
    confirmation_number: Optional[str] = Field(default=None, max_length=100)
    funding_source: Optional[str] = Field(default=None, max_length=200)
    notes: Optional[str] = Field(default=None, max_length=2000)


class FundingStatusResponse(BaseModel):
    id: UUID
    loan_id: UUID
    status: FundingStatusType
    scheduled_date: Optional[date] = None
    funded_date: Optional[date] = None
    funded_amount: Optional[Decimal] = None
    confirmation_number: Optional[str] = None
    funding_source: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

from app.models.hmda_record import HMDAActionTaken, HMDADenialReason, HMDAValidationStatus
from app.models.adverse_action import (
    AdverseActionType,
    AdverseActionReasonCode,
    AdverseActionStatus,
)
from app.models.loan import LoanStatus, LoanPurposeType, LoanType


# ─── HMDA Schemas ────────────────────────────────────────────────────────────


class HMDARecordResponse(BaseModel):
    id: UUID
    loan_id: UUID
    activity_year: int
    lei: Optional[str] = None
    uli: Optional[str] = None
    action_taken: Optional[HMDAActionTaken] = None
    action_taken_date: Optional[date] = None
    denial_reason_1: Optional[HMDADenialReason] = None
    denial_reason_2: Optional[HMDADenialReason] = None
    denial_reason_3: Optional[HMDADenialReason] = None
    denial_reason_4: Optional[HMDADenialReason] = None
    loan_purpose: Optional[str] = None
    loan_type: Optional[str] = None
    loan_amount: Optional[Decimal] = None
    interest_rate: Optional[Decimal] = None
    rate_spread: Optional[Decimal] = None
    hoepa_status: Optional[str] = None
    lien_status: Optional[str] = None
    loan_term_months: Optional[int] = None
    property_type: Optional[str] = None
    occupancy_type: Optional[str] = None
    property_state: Optional[str] = None
    property_county: Optional[str] = None
    census_tract: Optional[str] = None
    applicant_ethnicity: Optional[str] = None
    applicant_race: Optional[str] = None
    applicant_sex: Optional[str] = None
    co_applicant_ethnicity: Optional[str] = None
    co_applicant_race: Optional[str] = None
    co_applicant_sex: Optional[str] = None
    applicant_income: Optional[Decimal] = None
    dti_ratio: Optional[Decimal] = None
    combined_ltv: Optional[Decimal] = None
    validation_status: HMDAValidationStatus
    validation_errors: Optional[str] = None
    application_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    # Joined fields
    loan_number: Optional[str] = None
    borrower_name: Optional[str] = None
    loan_status: Optional[LoanStatus] = None

    model_config = ConfigDict(from_attributes=True)


class HMDARecordUpdate(BaseModel):
    action_taken: Optional[HMDAActionTaken] = None
    action_taken_date: Optional[date] = None
    denial_reason_1: Optional[HMDADenialReason] = None
    denial_reason_2: Optional[HMDADenialReason] = None
    denial_reason_3: Optional[HMDADenialReason] = None
    denial_reason_4: Optional[HMDADenialReason] = None
    census_tract: Optional[str] = Field(default=None, max_length=11)
    applicant_income: Optional[Decimal] = None
    dti_ratio: Optional[Decimal] = None
    combined_ltv: Optional[Decimal] = None


class PaginatedHMDARecords(BaseModel):
    items: List[HMDARecordResponse]
    total: int
    skip: int
    limit: int


class HMDAValidationResult(BaseModel):
    loan_id: UUID
    is_valid: bool
    errors: List[str]
    warnings: List[str]


# ─── Adverse Action Schemas ──────────────────────────────────────────────────


class AdverseActionCreate(BaseModel):
    action_type: AdverseActionType
    reason_code_1: Optional[AdverseActionReasonCode] = None
    reason_code_2: Optional[AdverseActionReasonCode] = None
    reason_code_3: Optional[AdverseActionReasonCode] = None
    reason_code_4: Optional[AdverseActionReasonCode] = None
    decision_date: date
    delivery_method: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = Field(default=None, max_length=5000)


class AdverseActionUpdate(BaseModel):
    status: Optional[AdverseActionStatus] = None
    sent_date: Optional[date] = None
    delivery_method: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = Field(default=None, max_length=5000)


class AdverseActionResponse(BaseModel):
    id: UUID
    loan_id: UUID
    action_type: AdverseActionType
    status: AdverseActionStatus
    reason_code_1: Optional[AdverseActionReasonCode] = None
    reason_code_2: Optional[AdverseActionReasonCode] = None
    reason_code_3: Optional[AdverseActionReasonCode] = None
    reason_code_4: Optional[AdverseActionReasonCode] = None
    decision_date: date
    notice_deadline: date
    sent_date: Optional[date] = None
    delivery_method: Optional[str] = None
    notes: Optional[str] = None
    created_by_id: Optional[UUID] = None
    sent_by_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    # Joined fields
    loan_number: Optional[str] = None
    borrower_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedAdverseActions(BaseModel):
    items: List[AdverseActionResponse]
    total: int
    skip: int
    limit: int


# ─── TRID Tolerance Schemas ──────────────────────────────────────────────────


class TRIDExceptionItem(BaseModel):
    loan_id: UUID
    loan_number: str
    borrower_name: Optional[str] = None
    loan_status: LoanStatus
    le_issued_date: Optional[date] = None
    le_version: int
    tolerance_category: str
    le_total: Decimal
    cd_total: Optional[Decimal] = None
    variance: Optional[Decimal] = None
    threshold: Optional[Decimal] = None
    is_violation: bool


class PaginatedTRIDExceptions(BaseModel):
    items: List[TRIDExceptionItem]
    total: int
    skip: int
    limit: int


# ─── Dashboard Stats ─────────────────────────────────────────────────────────


class ComplianceDashboardStats(BaseModel):
    # HMDA
    hmda_total_records: int
    hmda_valid: int
    hmda_errors: int
    hmda_pending: int

    # Adverse actions
    aa_total: int
    aa_pending_send: int
    aa_overdue: int
    aa_sent_this_month: int

    # TRID
    trid_total_loans_with_le: int
    trid_tolerance_exceptions: int
    trid_le_deadline_approaching: int

    # Loans by action
    loans_originated: int
    loans_denied: int
    loans_withdrawn: int
    loans_in_process: int

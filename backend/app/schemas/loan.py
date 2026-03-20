from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict, field_validator

from app.models.loan import LoanStatus, LoanPurposeType, LoanType


# ---------------------------------------------------------------------------
# Borrower sub-schema (used inside LoanResponse)
# ---------------------------------------------------------------------------

class BorrowerResponse(BaseModel):
    id: UUID
    loan_id: UUID
    borrower_classification: str
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    email: str
    phone: str
    credit_score: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Document sub-schema (used inside LoanResponse)
# ---------------------------------------------------------------------------

class DocumentResponse(BaseModel):
    id: UUID
    loan_id: UUID
    document_type: str
    document_status: str
    original_filename: str
    uploaded_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Loan schemas
# ---------------------------------------------------------------------------

class LoanCreate(BaseModel):
    loan_purpose_type: LoanPurposeType
    loan_type: LoanType
    loan_amount: Decimal = Field(gt=0, le=50_000_000, decimal_places=2)
    property_address_line: str = Field(min_length=5, max_length=200)
    property_city: str = Field(min_length=2, max_length=100)
    property_state: str = Field(min_length=2, max_length=2)
    property_zip: str = Field(min_length=5, max_length=10)

    @field_validator("property_state")
    @classmethod
    def uppercase_state(cls, v: str) -> str:
        return v.upper()


class LoanUpdate(BaseModel):
    """Partial update schema — all fields optional."""
    status: Optional[LoanStatus] = None
    loan_amount: Optional[Decimal] = Field(default=None, gt=0, le=50_000_000)
    note_rate_percent: Optional[Decimal] = Field(default=None, ge=0, le=30)
    property_address_line: Optional[str] = Field(default=None, min_length=5, max_length=200)
    property_city: Optional[str] = Field(default=None, min_length=2, max_length=100)
    property_state: Optional[str] = Field(default=None, min_length=2, max_length=2)
    property_zip: Optional[str] = Field(default=None, min_length=5, max_length=10)
    property_county: Optional[str] = Field(default=None, max_length=100)
    assigned_lo_id: Optional[UUID] = None
    assigned_processor_id: Optional[UUID] = None
    assigned_underwriter_id: Optional[UUID] = None
    application_received_date: Optional[date] = None
    estimated_close_date: Optional[date] = None


class LoanListItem(BaseModel):
    id: UUID
    loan_number: str
    status: LoanStatus
    loan_amount: Decimal
    loan_purpose_type: LoanPurposeType
    loan_type: LoanType
    property_city: str
    property_state: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoanResponse(BaseModel):
    id: UUID
    loan_number: str
    status: LoanStatus
    loan_purpose_type: LoanPurposeType
    loan_type: LoanType
    loan_amount: Decimal
    note_rate_percent: Optional[Decimal] = None
    property_address_line: str
    property_city: str
    property_state: str
    property_zip: str
    property_county: Optional[str] = None
    created_by_id: UUID
    assigned_lo_id: Optional[UUID] = None
    assigned_processor_id: Optional[UUID] = None
    assigned_underwriter_id: Optional[UUID] = None
    mismo_data: Optional[dict] = None
    application_received_date: Optional[date] = None
    estimated_close_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    borrowers: List[BorrowerResponse] = []
    documents: List[DocumentResponse] = []

    model_config = ConfigDict(from_attributes=True)


class PaginatedLoanList(BaseModel):
    items: List[LoanListItem]
    total: int
    skip: int
    limit: int

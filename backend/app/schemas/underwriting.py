from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

from app.models.loan import LoanStatus, LoanPurposeType, LoanType
from app.models.underwriting_decision import UnderwritingDecisionType
from app.schemas.condition import ConditionCreate


# ─── Decision schemas ─────────────────────────────────────────────────────────

class UnderwritingDecisionCreate(BaseModel):
    decision_type: UnderwritingDecisionType
    notes: Optional[str] = Field(default=None, max_length=5000)
    conditions: Optional[List[ConditionCreate]] = None


class UnderwritingDecisionResponse(BaseModel):
    id: UUID
    loan_id: UUID
    decision_type: UnderwritingDecisionType
    decided_by_id: Optional[UUID] = None
    notes: Optional[str] = None
    decided_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Queue schemas ─────────────────────────────────────────────────────────────

class UnderwritingQueueItem(BaseModel):
    id: UUID
    loan_number: str
    status: LoanStatus
    loan_amount: Decimal
    loan_purpose_type: LoanPurposeType
    loan_type: LoanType
    property_city: str
    property_state: str
    created_at: datetime
    primary_borrower_name: Optional[str] = None
    assigned_underwriter_name: Optional[str] = None
    assigned_underwriter_id: Optional[UUID] = None
    days_in_status: Optional[int] = None
    latest_aus_finding: Optional[str] = None
    latest_aus_system: Optional[str] = None
    conditions_open: int = 0
    conditions_total: int = 0

    model_config = ConfigDict(from_attributes=True)


class PaginatedUnderwritingQueue(BaseModel):
    items: List[UnderwritingQueueItem]
    total: int
    skip: int
    limit: int


class UnderwritingQueueStats(BaseModel):
    total_in_queue: int
    unassigned_count: int
    avg_days_in_status: Optional[float] = None
    by_status: dict[str, int]


# ─── Assign schema ─────────────────────────────────────────────────────────────

class AssignUnderwriterPayload(BaseModel):
    underwriter_id: Optional[UUID] = None

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

from app.models.aus_result import AUSSystem, AUSFinding


class AUSResultCreate(BaseModel):
    system: AUSSystem
    casefile_id: str = Field(min_length=1, max_length=100)
    finding: AUSFinding
    max_ltv_percent: Optional[Decimal] = Field(default=None, ge=0, le=100)
    max_cltv_percent: Optional[Decimal] = Field(default=None, ge=0, le=100)
    reserves_months: Optional[Decimal] = Field(default=None, ge=0, le=36)
    documentation_type: Optional[str] = Field(default=None, max_length=100)
    doc_requirements: Optional[List[str]] = None
    recommendations: Optional[List[str]] = None
    findings_summary: Optional[str] = None
    run_at: datetime


class AUSResultResponse(BaseModel):
    id: UUID
    loan_id: UUID
    system: AUSSystem
    casefile_id: str
    submission_number: int
    finding: AUSFinding
    max_ltv_percent: Optional[Decimal] = None
    max_cltv_percent: Optional[Decimal] = None
    reserves_months: Optional[Decimal] = None
    documentation_type: Optional[str] = None
    doc_requirements: Optional[List[str]] = None
    recommendations: Optional[List[str]] = None
    findings_summary: Optional[str] = None
    submitted_by_id: Optional[UUID] = None
    run_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

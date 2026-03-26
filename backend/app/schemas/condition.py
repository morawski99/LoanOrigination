from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

from app.models.condition import ConditionType, ConditionStatus


class ConditionCreate(BaseModel):
    condition_type: ConditionType
    description: str = Field(min_length=1, max_length=2000)
    due_date: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    assigned_to: Optional[str] = Field(default=None, max_length=100)


class ConditionUpdate(BaseModel):
    condition_type: Optional[ConditionType] = None
    description: Optional[str] = Field(default=None, min_length=1, max_length=2000)
    status: Optional[ConditionStatus] = None
    due_date: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    assigned_to: Optional[str] = Field(default=None, max_length=100)


class ConditionResponse(BaseModel):
    id: UUID
    loan_id: UUID
    condition_type: ConditionType
    status: ConditionStatus
    description: str
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    created_by_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

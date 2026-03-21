"""
URLA (Uniform Residential Loan Application) Pydantic v2 schemas.
All response models use ConfigDict(from_attributes=True) for ORM compatibility.
"""
import enum
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.borrower import CitizenshipResidencyType, MaritalStatusType
from app.models.residence import ResidencyType, HousingExpenseType
from app.models.employment import EmploymentStatusType
from app.models.other_income import OtherIncomeType
from app.models.asset import AssetType
from app.models.liability import LiabilityType
from app.models.reo import PropertyUsageType
from app.models.declaration import OccupancyIntentType


# ---------------------------------------------------------------------------
# URLAProgress / Section Status
# ---------------------------------------------------------------------------

class URLASectionStatus(str, enum.Enum):
    NOT_STARTED = "NotStarted"
    IN_PROGRESS = "InProgress"
    COMPLETED = "Completed"


class URLAProgress(BaseModel):
    personal_info: URLASectionStatus = URLASectionStatus.NOT_STARTED
    residence: URLASectionStatus = URLASectionStatus.NOT_STARTED
    employment: URLASectionStatus = URLASectionStatus.NOT_STARTED
    assets_liabilities: URLASectionStatus = URLASectionStatus.NOT_STARTED
    loan_property: URLASectionStatus = URLASectionStatus.NOT_STARTED
    declarations: URLASectionStatus = URLASectionStatus.NOT_STARTED
    acknowledgments: URLASectionStatus = URLASectionStatus.NOT_STARTED
    military_service: URLASectionStatus = URLASectionStatus.NOT_STARTED
    demographics: URLASectionStatus = URLASectionStatus.NOT_STARTED

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Residence schemas
# ---------------------------------------------------------------------------

class ResidenceCreate(BaseModel):
    residency_type: ResidencyType
    address_line: str = Field(max_length=200)
    unit_number: Optional[str] = Field(default=None, max_length=20)
    city: str = Field(max_length=100)
    state: str = Field(max_length=2)
    zip: str = Field(max_length=10)
    country: str = Field(default="US", max_length=2)
    housing_expense_type: HousingExpenseType
    monthly_rent_amount: Optional[Decimal] = Field(default=None, ge=0)
    residency_start_date: Optional[date] = None
    residency_end_date: Optional[date] = None
    is_current: bool = True


class ResidenceUpdate(BaseModel):
    residency_type: Optional[ResidencyType] = None
    address_line: Optional[str] = Field(default=None, max_length=200)
    unit_number: Optional[str] = Field(default=None, max_length=20)
    city: Optional[str] = Field(default=None, max_length=100)
    state: Optional[str] = Field(default=None, max_length=2)
    zip: Optional[str] = Field(default=None, max_length=10)
    country: Optional[str] = Field(default=None, max_length=2)
    housing_expense_type: Optional[HousingExpenseType] = None
    monthly_rent_amount: Optional[Decimal] = Field(default=None, ge=0)
    residency_start_date: Optional[date] = None
    residency_end_date: Optional[date] = None
    is_current: Optional[bool] = None


class ResidenceResponse(BaseModel):
    id: UUID
    borrower_id: UUID
    residency_type: ResidencyType
    address_line: str
    unit_number: Optional[str] = None
    city: str
    state: str
    zip: str
    country: str
    housing_expense_type: HousingExpenseType
    monthly_rent_amount: Optional[Decimal] = None
    residency_start_date: Optional[date] = None
    residency_end_date: Optional[date] = None
    is_current: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Employment schemas
# ---------------------------------------------------------------------------

class EmploymentCreate(BaseModel):
    employment_status_type: EmploymentStatusType
    is_current: bool = True
    employer_name: Optional[str] = Field(default=None, max_length=200)
    employer_address_line: Optional[str] = Field(default=None, max_length=200)
    employer_city: Optional[str] = Field(default=None, max_length=100)
    employer_state: Optional[str] = Field(default=None, max_length=2)
    employer_zip: Optional[str] = Field(default=None, max_length=10)
    employer_phone: Optional[str] = Field(default=None, max_length=20)
    position_description: Optional[str] = Field(default=None, max_length=200)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    years_in_profession: Optional[Decimal] = Field(default=None, ge=0)
    is_primary: bool = True
    self_employed_indicator: bool = False
    ownership_interest_percent: Optional[Decimal] = Field(default=None, ge=0, le=100)
    base_income_amount: Optional[Decimal] = Field(default=None, ge=0)
    overtime_income_amount: Optional[Decimal] = Field(default=None, ge=0)
    bonus_income_amount: Optional[Decimal] = Field(default=None, ge=0)
    commission_income_amount: Optional[Decimal] = Field(default=None, ge=0)
    military_entitlements_amount: Optional[Decimal] = Field(default=None, ge=0)
    other_income_amount: Optional[Decimal] = Field(default=None, ge=0)


class EmploymentUpdate(BaseModel):
    employment_status_type: Optional[EmploymentStatusType] = None
    is_current: Optional[bool] = None
    employer_name: Optional[str] = Field(default=None, max_length=200)
    employer_address_line: Optional[str] = Field(default=None, max_length=200)
    employer_city: Optional[str] = Field(default=None, max_length=100)
    employer_state: Optional[str] = Field(default=None, max_length=2)
    employer_zip: Optional[str] = Field(default=None, max_length=10)
    employer_phone: Optional[str] = Field(default=None, max_length=20)
    position_description: Optional[str] = Field(default=None, max_length=200)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    years_in_profession: Optional[Decimal] = Field(default=None, ge=0)
    is_primary: Optional[bool] = None
    self_employed_indicator: Optional[bool] = None
    ownership_interest_percent: Optional[Decimal] = Field(default=None, ge=0, le=100)
    base_income_amount: Optional[Decimal] = Field(default=None, ge=0)
    overtime_income_amount: Optional[Decimal] = Field(default=None, ge=0)
    bonus_income_amount: Optional[Decimal] = Field(default=None, ge=0)
    commission_income_amount: Optional[Decimal] = Field(default=None, ge=0)
    military_entitlements_amount: Optional[Decimal] = Field(default=None, ge=0)
    other_income_amount: Optional[Decimal] = Field(default=None, ge=0)


class EmploymentResponse(BaseModel):
    id: UUID
    borrower_id: UUID
    employment_status_type: EmploymentStatusType
    is_current: bool
    employer_name: Optional[str] = None
    employer_address_line: Optional[str] = None
    employer_city: Optional[str] = None
    employer_state: Optional[str] = None
    employer_zip: Optional[str] = None
    employer_phone: Optional[str] = None
    position_description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    years_in_profession: Optional[Decimal] = None
    is_primary: bool
    self_employed_indicator: bool
    ownership_interest_percent: Optional[Decimal] = None
    base_income_amount: Optional[Decimal] = None
    overtime_income_amount: Optional[Decimal] = None
    bonus_income_amount: Optional[Decimal] = None
    commission_income_amount: Optional[Decimal] = None
    military_entitlements_amount: Optional[Decimal] = None
    other_income_amount: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Other Income schemas
# ---------------------------------------------------------------------------

class OtherIncomeCreate(BaseModel):
    income_type: OtherIncomeType
    monthly_income_amount: Decimal = Field(ge=0)
    description: Optional[str] = Field(default=None, max_length=200)


class OtherIncomeResponse(BaseModel):
    id: UUID
    borrower_id: UUID
    income_type: OtherIncomeType
    monthly_income_amount: Decimal
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Asset schemas
# ---------------------------------------------------------------------------

class AssetCreate(BaseModel):
    asset_type: AssetType
    financial_institution_name: Optional[str] = Field(default=None, max_length=200)
    account_identifier: Optional[str] = Field(default=None, max_length=50)
    current_value_amount: Decimal = Field(ge=0)
    gift_source_type: Optional[str] = Field(default=None, max_length=100)
    is_deplete_indicator: bool = False


class AssetUpdate(BaseModel):
    asset_type: Optional[AssetType] = None
    financial_institution_name: Optional[str] = Field(default=None, max_length=200)
    account_identifier: Optional[str] = Field(default=None, max_length=50)
    current_value_amount: Optional[Decimal] = Field(default=None, ge=0)
    gift_source_type: Optional[str] = Field(default=None, max_length=100)
    is_deplete_indicator: Optional[bool] = None


class AssetResponse(BaseModel):
    id: UUID
    borrower_id: UUID
    asset_type: AssetType
    financial_institution_name: Optional[str] = None
    account_identifier: Optional[str] = None
    current_value_amount: Decimal
    gift_source_type: Optional[str] = None
    is_deplete_indicator: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Liability schemas
# ---------------------------------------------------------------------------

class LiabilityCreate(BaseModel):
    liability_type: LiabilityType
    creditor_name: Optional[str] = Field(default=None, max_length=200)
    account_identifier: Optional[str] = Field(default=None, max_length=50)
    monthly_payment_amount: Optional[Decimal] = Field(default=None, ge=0)
    unpaid_balance_amount: Optional[Decimal] = Field(default=None, ge=0)
    months_remaining: Optional[int] = Field(default=None, ge=0)
    will_be_paid_off_indicator: bool = False
    exclude_from_liabilities_indicator: bool = False
    exclusion_reason: Optional[str] = Field(default=None, max_length=200)


class LiabilityUpdate(BaseModel):
    liability_type: Optional[LiabilityType] = None
    creditor_name: Optional[str] = Field(default=None, max_length=200)
    account_identifier: Optional[str] = Field(default=None, max_length=50)
    monthly_payment_amount: Optional[Decimal] = Field(default=None, ge=0)
    unpaid_balance_amount: Optional[Decimal] = Field(default=None, ge=0)
    months_remaining: Optional[int] = Field(default=None, ge=0)
    will_be_paid_off_indicator: Optional[bool] = None
    exclude_from_liabilities_indicator: Optional[bool] = None
    exclusion_reason: Optional[str] = Field(default=None, max_length=200)


class LiabilityResponse(BaseModel):
    id: UUID
    borrower_id: UUID
    liability_type: LiabilityType
    creditor_name: Optional[str] = None
    account_identifier: Optional[str] = None
    monthly_payment_amount: Optional[Decimal] = None
    unpaid_balance_amount: Optional[Decimal] = None
    months_remaining: Optional[int] = None
    will_be_paid_off_indicator: bool
    exclude_from_liabilities_indicator: bool
    exclusion_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# REO schemas
# ---------------------------------------------------------------------------

class REOCreate(BaseModel):
    property_address_line: str = Field(max_length=200)
    city: str = Field(max_length=100)
    state: str = Field(max_length=2)
    zip: str = Field(max_length=10)
    property_usage_type: PropertyUsageType
    pending_sale_indicator: bool = False
    monthly_rental_income_amount: Optional[Decimal] = Field(default=None, ge=0)
    mortgage_liability_id: Optional[UUID] = None
    present_market_value_amount: Optional[Decimal] = Field(default=None, ge=0)
    gross_rental_income_amount: Optional[Decimal] = Field(default=None, ge=0)
    mortgage_payment_amount: Optional[Decimal] = Field(default=None, ge=0)
    insurance_maintenance_taxes_amount: Optional[Decimal] = Field(default=None, ge=0)
    net_rental_income_amount: Optional[Decimal] = None


class REOUpdate(BaseModel):
    property_address_line: Optional[str] = Field(default=None, max_length=200)
    city: Optional[str] = Field(default=None, max_length=100)
    state: Optional[str] = Field(default=None, max_length=2)
    zip: Optional[str] = Field(default=None, max_length=10)
    property_usage_type: Optional[PropertyUsageType] = None
    pending_sale_indicator: Optional[bool] = None
    monthly_rental_income_amount: Optional[Decimal] = Field(default=None, ge=0)
    mortgage_liability_id: Optional[UUID] = None
    present_market_value_amount: Optional[Decimal] = Field(default=None, ge=0)
    gross_rental_income_amount: Optional[Decimal] = Field(default=None, ge=0)
    mortgage_payment_amount: Optional[Decimal] = Field(default=None, ge=0)
    insurance_maintenance_taxes_amount: Optional[Decimal] = Field(default=None, ge=0)
    net_rental_income_amount: Optional[Decimal] = None


class REOResponse(BaseModel):
    id: UUID
    borrower_id: UUID
    property_address_line: str
    city: str
    state: str
    zip: str
    property_usage_type: PropertyUsageType
    pending_sale_indicator: bool
    monthly_rental_income_amount: Optional[Decimal] = None
    mortgage_liability_id: Optional[UUID] = None
    present_market_value_amount: Optional[Decimal] = None
    gross_rental_income_amount: Optional[Decimal] = None
    mortgage_payment_amount: Optional[Decimal] = None
    insurance_maintenance_taxes_amount: Optional[Decimal] = None
    net_rental_income_amount: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Declaration schemas
# ---------------------------------------------------------------------------

class DeclarationUpsert(BaseModel):
    occupancy_intent_type: Optional[OccupancyIntentType] = None
    family_relationship_with_seller_indicator: Optional[bool] = None
    borrowed_down_payment_indicator: Optional[bool] = None
    applied_for_other_mortgage_indicator: Optional[bool] = None
    apply_new_mortgage_indicator: Optional[bool] = None
    outstanding_judgment_indicator: Optional[bool] = None
    declared_bankruptcy_indicator: Optional[bool] = None
    bankruptcy_type: Optional[str] = Field(default=None, max_length=50)
    foreclosure_indicator: Optional[bool] = None
    party_to_lawsuit_indicator: Optional[bool] = None
    federal_debt_delinquency_indicator: Optional[bool] = None
    alimony_obligation_indicator: Optional[bool] = None
    alimony_amount: Optional[Decimal] = Field(default=None, ge=0)
    co_signer_indicator: Optional[bool] = None
    us_citizen_indicator: Optional[bool] = None
    permanent_resident_alien_indicator: Optional[bool] = None
    ownership_in_past_3_years_indicator: Optional[bool] = None
    property_ownership_type: Optional[str] = Field(default=None, max_length=100)


class DeclarationResponse(BaseModel):
    id: UUID
    borrower_id: UUID
    occupancy_intent_type: Optional[OccupancyIntentType] = None
    family_relationship_with_seller_indicator: Optional[bool] = None
    borrowed_down_payment_indicator: Optional[bool] = None
    applied_for_other_mortgage_indicator: Optional[bool] = None
    apply_new_mortgage_indicator: Optional[bool] = None
    outstanding_judgment_indicator: Optional[bool] = None
    declared_bankruptcy_indicator: Optional[bool] = None
    bankruptcy_type: Optional[str] = None
    foreclosure_indicator: Optional[bool] = None
    party_to_lawsuit_indicator: Optional[bool] = None
    federal_debt_delinquency_indicator: Optional[bool] = None
    alimony_obligation_indicator: Optional[bool] = None
    alimony_amount: Optional[Decimal] = None
    co_signer_indicator: Optional[bool] = None
    us_citizen_indicator: Optional[bool] = None
    permanent_resident_alien_indicator: Optional[bool] = None
    ownership_in_past_3_years_indicator: Optional[bool] = None
    property_ownership_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Military Service schemas
# ---------------------------------------------------------------------------

class MilitaryServiceUpsert(BaseModel):
    did_serve_indicator: bool = False
    active_duty_indicator: bool = False
    retired_discharged_separated_indicator: bool = False
    surviving_spouse_indicator: bool = False
    scra_indicator: bool = False
    branch_of_service_type: Optional[str] = Field(default=None, max_length=50)
    service_start_date: Optional[date] = None
    service_end_date: Optional[date] = None
    expiration_date_of_service: Optional[date] = None


class MilitaryServiceResponse(BaseModel):
    id: UUID
    borrower_id: UUID
    did_serve_indicator: bool
    active_duty_indicator: bool
    retired_discharged_separated_indicator: bool
    surviving_spouse_indicator: bool
    scra_indicator: bool
    branch_of_service_type: Optional[str] = None
    service_start_date: Optional[date] = None
    service_end_date: Optional[date] = None
    expiration_date_of_service: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Demographics schemas
# ---------------------------------------------------------------------------

class DemographicsUpsert(BaseModel):
    ethnicity_hispanic_latino_indicator: Optional[bool] = None
    ethnicity_mexican_indicator: bool = False
    ethnicity_puerto_rican_indicator: bool = False
    ethnicity_cuban_indicator: bool = False
    ethnicity_other_hispanic_indicator: bool = False
    ethnicity_other_hispanic_description: Optional[str] = Field(default=None, max_length=100)
    ethnicity_not_hispanic_indicator: Optional[bool] = None
    ethnicity_not_provided_indicator: bool = False
    race_american_indian_indicator: bool = False
    race_american_indian_tribe_name: Optional[str] = Field(default=None, max_length=100)
    race_asian_indicator: bool = False
    race_asian_indian_indicator: bool = False
    race_chinese_indicator: bool = False
    race_filipino_indicator: bool = False
    race_japanese_indicator: bool = False
    race_korean_indicator: bool = False
    race_vietnamese_indicator: bool = False
    race_other_asian_indicator: bool = False
    race_other_asian_description: Optional[str] = Field(default=None, max_length=100)
    race_black_african_american_indicator: bool = False
    race_native_hawaiian_indicator: bool = False
    race_guamanian_chamorro_indicator: bool = False
    race_samoan_indicator: bool = False
    race_other_pacific_islander_indicator: bool = False
    race_other_pacific_islander_description: Optional[str] = Field(default=None, max_length=100)
    race_white_indicator: bool = False
    race_not_provided_indicator: bool = False
    sex_male_indicator: Optional[bool] = None
    sex_female_indicator: Optional[bool] = None
    sex_not_provided_indicator: bool = False
    sex_prefer_not_to_disclose: bool = False
    collection_method_type: Optional[str] = Field(default=None, max_length=50)


class DemographicsResponse(BaseModel):
    id: UUID
    borrower_id: UUID
    ethnicity_hispanic_latino_indicator: Optional[bool] = None
    ethnicity_mexican_indicator: bool
    ethnicity_puerto_rican_indicator: bool
    ethnicity_cuban_indicator: bool
    ethnicity_other_hispanic_indicator: bool
    ethnicity_other_hispanic_description: Optional[str] = None
    ethnicity_not_hispanic_indicator: Optional[bool] = None
    ethnicity_not_provided_indicator: bool
    race_american_indian_indicator: bool
    race_american_indian_tribe_name: Optional[str] = None
    race_asian_indicator: bool
    race_asian_indian_indicator: bool
    race_chinese_indicator: bool
    race_filipino_indicator: bool
    race_japanese_indicator: bool
    race_korean_indicator: bool
    race_vietnamese_indicator: bool
    race_other_asian_indicator: bool
    race_other_asian_description: Optional[str] = None
    race_black_african_american_indicator: bool
    race_native_hawaiian_indicator: bool
    race_guamanian_chamorro_indicator: bool
    race_samoan_indicator: bool
    race_other_pacific_islander_indicator: bool
    race_other_pacific_islander_description: Optional[str] = None
    race_white_indicator: bool
    race_not_provided_indicator: bool
    sex_male_indicator: Optional[bool] = None
    sex_female_indicator: Optional[bool] = None
    sex_not_provided_indicator: bool
    sex_prefer_not_to_disclose: bool
    collection_method_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Borrower Create schema
# ---------------------------------------------------------------------------

class BorrowerCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    middle_name: Optional[str] = Field(default=None, max_length=100)
    email: str = Field(max_length=254)
    phone: str = Field(min_length=7, max_length=20)
    borrower_classification: str = Field(default="Primary")


# ---------------------------------------------------------------------------
# Borrower Personal Info update schema
# ---------------------------------------------------------------------------

class BorrowerPersonalInfoUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    middle_name: Optional[str] = Field(default=None, max_length=100)
    suffix_name: Optional[str] = Field(default=None, max_length=20)
    ssn_last4: Optional[str] = Field(default=None, max_length=4, description="For display only")
    dob_display: Optional[str] = Field(default=None, description="MM/YYYY format for display")
    email: Optional[str] = Field(default=None, max_length=254)
    phone: Optional[str] = Field(default=None, max_length=20)
    home_phone: Optional[str] = Field(default=None, max_length=20)
    work_phone: Optional[str] = Field(default=None, max_length=20)
    citizenship_residency_type: Optional[CitizenshipResidencyType] = None
    marital_status_type: Optional[MaritalStatusType] = None
    number_of_dependents: Optional[int] = Field(default=None, ge=0, le=20)
    dependent_ages_description: Optional[str] = Field(default=None, max_length=100)


# ---------------------------------------------------------------------------
# Full Borrower Response (extends base with all URLA relationships)
# ---------------------------------------------------------------------------

class BorrowerResponse(BaseModel):
    """Base borrower response schema (matches existing schema in loan.py)."""
    id: UUID
    loan_id: UUID
    borrower_classification: str
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    suffix_name: Optional[str] = None
    email: str
    phone: str
    home_phone: Optional[str] = None
    work_phone: Optional[str] = None
    credit_score: Optional[int] = None
    citizenship_residency_type: Optional[CitizenshipResidencyType] = None
    marital_status_type: Optional[MaritalStatusType] = None
    number_of_dependents: Optional[int] = None
    dependent_ages_description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FullBorrowerResponse(BorrowerResponse):
    """Full borrower response with all URLA data sections."""
    residences: List[ResidenceResponse] = []
    employments: List[EmploymentResponse] = []
    other_incomes: List[OtherIncomeResponse] = []
    assets: List[AssetResponse] = []
    liabilities: List[LiabilityResponse] = []
    reo_properties: List[REOResponse] = []
    declaration: Optional[DeclarationResponse] = None
    military_service: Optional[MilitaryServiceResponse] = None
    demographics: Optional[DemographicsResponse] = None

    model_config = ConfigDict(from_attributes=True)

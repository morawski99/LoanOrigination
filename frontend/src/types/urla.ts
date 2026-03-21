/**
 * URLA (Uniform Residential Loan Application) TypeScript types.
 * Mirrors backend Pydantic schemas from /backend/app/schemas/urla.py
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum URLASectionStatus {
  NOT_STARTED = "NotStarted",
  IN_PROGRESS = "InProgress",
  COMPLETED = "Completed",
}

export enum CitizenshipResidencyType {
  US_CITIZEN = "USCitizen",
  PERMANENT_RESIDENT_ALIEN = "PermanentResidentAlien",
  NON_PERMANENT_RESIDENT_ALIEN = "NonPermanentResidentAlien",
  NON_RESIDENT_ALIEN = "NonResidentAlien",
}

export enum MaritalStatusType {
  MARRIED = "Married",
  SEPARATED = "Separated",
  UNMARRIED = "Unmarried",
}

export enum ResidencyType {
  CURRENT = "Current",
  FORMER = "Former",
  MAILING = "Mailing",
}

export enum HousingExpenseType {
  OWN = "Own",
  RENT = "Rent",
  LIVING_RENT_FREE = "LivingRentFree",
  OTHER = "Other",
}

export enum EmploymentStatusType {
  EMPLOYED = "Employed",
  SELF_EMPLOYED = "SelfEmployed",
  RETIRED = "Retired",
  UNEMPLOYED_NOT_IN_LABOR_FORCE = "UnemployedNotInLaborForce",
  OTHER = "Other",
}

export enum OtherIncomeType {
  ALIMONY_CHILD_SUPPORT = "AlimonyChildSupport",
  AUTOMOBILE_EXPENSE_ACCOUNT = "AutomobileExpenseAccount",
  CAPITAL_GAINS = "CapitalGains",
  DEFINED_CONTRIBUTION_PLAN = "DefinedContributionPlan",
  DISABILITY = "Disability",
  FOSTER_CARE = "FosterCare",
  HOUSING_OR_PARSONAGE = "HousingOrParsonage",
  INTEREST_DIVIDENDS = "InterestDividends",
  MORTGAGE_CREDIT_CERTIFICATE = "MortgageCreditCertificate",
  MORTGAGE_DIFFERENTIAL = "MortgageDifferential",
  NOTES_RECEIVABLE_INSTALLMENT = "NotesReceivableInstallment",
  OTHER = "Other",
  PENSION = "Pension",
  PUBLIC_ASSISTANCE = "PublicAssistance",
  RENTAL_INCOME = "RentalIncome",
  RETIREMENT_FUNDS = "RetirementFunds",
  ROYALTY_PAYMENTS = "RoyaltyPayments",
  SOCIAL_SECURITY_DISABILITY = "SocialSecurityDisability",
  SOCIAL_SECURITY_INCOME = "SocialSecurityIncome",
  TRUST_INCOME = "TrustIncome",
  VA_BENEFITS_NON_EDUCATIONAL = "VABenefitsNonEducational",
}

export enum AssetType {
  CHECKING_ACCOUNT = "CheckingAccount",
  SAVINGS_ACCOUNT = "SavingsAccount",
  MONEY_MARKET_FUND = "MoneyMarketFund",
  CERTIFICATE_OF_DEPOSIT = "CertificateOfDeposit",
  MUTUAL_FUND = "MutualFund",
  STOCK = "Stock",
  BOND = "Bond",
  RETIREMENT_FUND = "RetirementFund",
  BRIDGE_LOAN_NOT_DEPOSITED = "BridgeLoanNotDeposited",
  INDIVIDUAL_DEVELOPMENT_ACCOUNT = "IndividualDevelopmentAccount",
  LIFE_INSURANCE = "LifeInsurance",
  TRUST_ACCOUNT = "TrustAccount",
  GIFT_FUNDS = "GiftFunds",
  GIFT_OF_EQUITY = "GiftOfEquity",
  GRANT_FUNDS = "GrantFunds",
  NET_PROCEEDS_FROM_SALE = "NetProceedsFromSale",
  NON_VESTED_RESTRICTED_STOCK_UNITS = "NonVestedRestrictedStockUnits",
  OTHER_LIQUID_ASSETS = "OtherLiquidAssets",
  OTHER_NON_LIQUID_ASSETS = "OtherNonLiquidAssets",
  PENDING_NET_SALE_PROCEEDS = "PendingNetSaleProceeds",
  SALE_OTHER_ASSETS = "SaleOtherAssets",
}

export enum LiabilityType {
  COLLECTIONS_JUDGEMENTS_AND_LIENS = "CollectionsJudgementsAndLiens",
  INSTALLMENT = "Installment",
  LEASE_PAYMENTS = "LeasePayments",
  MORTGAGE_LOAN = "MortgageLoan",
  OPEN_30_DAY_CHARGE_ACCOUNT = "Open30DayChargeAccount",
  REVOLVING = "Revolving",
  TAXES = "Taxes",
  HELOC = "HELOC",
  OTHER = "Other",
}

export enum PropertyUsageType {
  PRIMARY_RESIDENCE = "PrimaryResidence",
  SECOND_HOME = "SecondHome",
  INVESTOR = "Investor",
  FHA_SECONDARY_RESIDENCE = "FHASecondaryResidence",
}

export enum OccupancyIntentType {
  PRIMARY_RESIDENCE = "PrimaryResidence",
  SECOND_HOME = "SecondHome",
  INVESTMENT_PROPERTY = "InvestmentProperty",
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface URLAProgress {
  personal_info: URLASectionStatus;
  residence: URLASectionStatus;
  employment: URLASectionStatus;
  assets_liabilities: URLASectionStatus;
  loan_property: URLASectionStatus;
  declarations: URLASectionStatus;
  acknowledgments: URLASectionStatus;
  military_service: URLASectionStatus;
  demographics: URLASectionStatus;
}

export interface BorrowerResidence {
  id: string;
  borrower_id: string;
  residency_type: ResidencyType;
  address_line: string;
  unit_number?: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  housing_expense_type: HousingExpenseType;
  monthly_rent_amount?: number | null;
  residency_start_date?: string | null; // YYYY-MM-DD
  residency_end_date?: string | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface BorrowerEmployment {
  id: string;
  borrower_id: string;
  employment_status_type: EmploymentStatusType;
  is_current: boolean;
  employer_name?: string | null;
  employer_address_line?: string | null;
  employer_city?: string | null;
  employer_state?: string | null;
  employer_zip?: string | null;
  employer_phone?: string | null;
  position_description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  years_in_profession?: number | null;
  is_primary: boolean;
  self_employed_indicator: boolean;
  ownership_interest_percent?: number | null;
  base_income_amount?: number | null;
  overtime_income_amount?: number | null;
  bonus_income_amount?: number | null;
  commission_income_amount?: number | null;
  military_entitlements_amount?: number | null;
  other_income_amount?: number | null;
  created_at: string;
  updated_at: string;
}

export interface OtherIncome {
  id: string;
  borrower_id: string;
  income_type: OtherIncomeType;
  monthly_income_amount: number;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BorrowerAsset {
  id: string;
  borrower_id: string;
  asset_type: AssetType;
  financial_institution_name?: string | null;
  account_identifier?: string | null;
  current_value_amount: number;
  gift_source_type?: string | null;
  is_deplete_indicator: boolean;
  created_at: string;
  updated_at: string;
}

export interface BorrowerLiability {
  id: string;
  borrower_id: string;
  liability_type: LiabilityType;
  creditor_name?: string | null;
  account_identifier?: string | null;
  monthly_payment_amount?: number | null;
  unpaid_balance_amount?: number | null;
  months_remaining?: number | null;
  will_be_paid_off_indicator: boolean;
  exclude_from_liabilities_indicator: boolean;
  exclusion_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RealEstateOwned {
  id: string;
  borrower_id: string;
  property_address_line: string;
  city: string;
  state: string;
  zip: string;
  property_usage_type: PropertyUsageType;
  pending_sale_indicator: boolean;
  monthly_rental_income_amount?: number | null;
  mortgage_liability_id?: string | null;
  present_market_value_amount?: number | null;
  gross_rental_income_amount?: number | null;
  mortgage_payment_amount?: number | null;
  insurance_maintenance_taxes_amount?: number | null;
  net_rental_income_amount?: number | null;
  created_at: string;
  updated_at: string;
}

export interface BorrowerDeclaration {
  id: string;
  borrower_id: string;
  occupancy_intent_type?: OccupancyIntentType | null;
  family_relationship_with_seller_indicator?: boolean | null;
  borrowed_down_payment_indicator?: boolean | null;
  applied_for_other_mortgage_indicator?: boolean | null;
  apply_new_mortgage_indicator?: boolean | null;
  outstanding_judgment_indicator?: boolean | null;
  declared_bankruptcy_indicator?: boolean | null;
  bankruptcy_type?: string | null;
  foreclosure_indicator?: boolean | null;
  party_to_lawsuit_indicator?: boolean | null;
  federal_debt_delinquency_indicator?: boolean | null;
  alimony_obligation_indicator?: boolean | null;
  alimony_amount?: number | null;
  co_signer_indicator?: boolean | null;
  us_citizen_indicator?: boolean | null;
  permanent_resident_alien_indicator?: boolean | null;
  ownership_in_past_3_years_indicator?: boolean | null;
  property_ownership_type?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MilitaryService {
  id: string;
  borrower_id: string;
  did_serve_indicator: boolean;
  active_duty_indicator: boolean;
  retired_discharged_separated_indicator: boolean;
  surviving_spouse_indicator: boolean;
  scra_indicator: boolean;
  branch_of_service_type?: string | null;
  service_start_date?: string | null;
  service_end_date?: string | null;
  expiration_date_of_service?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BorrowerDemographics {
  id: string;
  borrower_id: string;
  ethnicity_hispanic_latino_indicator?: boolean | null;
  ethnicity_mexican_indicator: boolean;
  ethnicity_puerto_rican_indicator: boolean;
  ethnicity_cuban_indicator: boolean;
  ethnicity_other_hispanic_indicator: boolean;
  ethnicity_other_hispanic_description?: string | null;
  ethnicity_not_hispanic_indicator?: boolean | null;
  ethnicity_not_provided_indicator: boolean;
  race_american_indian_indicator: boolean;
  race_american_indian_tribe_name?: string | null;
  race_asian_indicator: boolean;
  race_asian_indian_indicator: boolean;
  race_chinese_indicator: boolean;
  race_filipino_indicator: boolean;
  race_japanese_indicator: boolean;
  race_korean_indicator: boolean;
  race_vietnamese_indicator: boolean;
  race_other_asian_indicator: boolean;
  race_other_asian_description?: string | null;
  race_black_african_american_indicator: boolean;
  race_native_hawaiian_indicator: boolean;
  race_guamanian_chamorro_indicator: boolean;
  race_samoan_indicator: boolean;
  race_other_pacific_islander_indicator: boolean;
  race_other_pacific_islander_description?: string | null;
  race_white_indicator: boolean;
  race_not_provided_indicator: boolean;
  sex_male_indicator?: boolean | null;
  sex_female_indicator?: boolean | null;
  sex_not_provided_indicator: boolean;
  sex_prefer_not_to_disclose: boolean;
  collection_method_type?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FullBorrower {
  id: string;
  loan_id: string;
  borrower_classification: "Primary" | "CoBorrower";
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  suffix_name?: string | null;
  ssn_last4?: string | null;
  date_of_birth?: string | null; // YYYY-MM-DD
  email: string;
  phone: string;
  home_phone?: string | null;
  work_phone?: string | null;
  credit_score?: number | null;
  citizenship_residency_type?: CitizenshipResidencyType | null;
  marital_status_type?: MaritalStatusType | null;
  number_of_dependents?: number | null;
  dependent_ages_description?: string | null;
  agreed_app?: boolean | null;
  agreed_credit_pull?: boolean | null;
  agreed_ecoa?: boolean | null;
  agreed_electronic?: boolean | null;
  created_at: string;
  updated_at: string;
  residences: BorrowerResidence[];
  employments: BorrowerEmployment[];
  other_incomes: OtherIncome[];
  assets: BorrowerAsset[];
  liabilities: BorrowerLiability[];
  reo_properties: RealEstateOwned[];
  declaration?: BorrowerDeclaration | null;
  military_service?: MilitaryService | null;
  demographics?: BorrowerDemographics | null;
}

// ---------------------------------------------------------------------------
// Create / Update payloads (subset for frontend use)
// ---------------------------------------------------------------------------

export type ResidenceCreate = Omit<BorrowerResidence, "id" | "borrower_id" | "created_at" | "updated_at">;
export type EmploymentCreate = Omit<BorrowerEmployment, "id" | "borrower_id" | "created_at" | "updated_at">;
export type OtherIncomeCreate = Pick<OtherIncome, "income_type" | "monthly_income_amount" | "description">;
export type AssetCreate = Omit<BorrowerAsset, "id" | "borrower_id" | "created_at" | "updated_at">;
export type LiabilityCreate = Omit<BorrowerLiability, "id" | "borrower_id" | "created_at" | "updated_at">;
export type REOCreate = Omit<RealEstateOwned, "id" | "borrower_id" | "created_at" | "updated_at">;

export type DeclarationUpsert = Omit<BorrowerDeclaration, "id" | "borrower_id" | "created_at" | "updated_at">;
export type MilitaryServiceUpsert = Omit<MilitaryService, "id" | "borrower_id" | "created_at" | "updated_at">;
export type DemographicsUpsert = Omit<BorrowerDemographics, "id" | "borrower_id" | "created_at" | "updated_at">;

export interface BorrowerPersonalInfo {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  suffix_name?: string;
  ssn_last4?: string;
  date_of_birth?: string; // YYYY-MM-DD
  email?: string;
  phone?: string;
  home_phone?: string;
  work_phone?: string;
  citizenship_residency_type?: CitizenshipResidencyType;
  marital_status_type?: MaritalStatusType;
  number_of_dependents?: number;
  dependent_ages_description?: string;
  agreed_app?: boolean;
  agreed_credit_pull?: boolean;
  agreed_ecoa?: boolean;
  agreed_electronic?: boolean;
}

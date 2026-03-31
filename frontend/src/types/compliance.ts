import type { LoanStatus } from "./loan";

// ─── HMDA ────────────────────────────────────────────────────────────────────

export type HMDAActionTaken = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

export const HMDAActionTakenLabels: Record<HMDAActionTaken, string> = {
  "1": "Loan Originated",
  "2": "Approved, Not Accepted",
  "3": "Application Denied",
  "4": "Withdrawn by Applicant",
  "5": "File Closed (Incomplete)",
  "6": "Loan Purchased",
  "7": "Preapproval Denied",
  "8": "Preapproval Approved, Not Accepted",
};

export type HMDADenialReason = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

export const HMDADenialReasonLabels: Record<HMDADenialReason, string> = {
  "1": "Debt-to-Income Ratio",
  "2": "Employment History",
  "3": "Credit History",
  "4": "Collateral",
  "5": "Insufficient Cash",
  "6": "Unverifiable Information",
  "7": "Credit Application Incomplete",
  "8": "Mortgage Insurance Denied",
  "9": "Other",
};

export type HMDAValidationStatus = "Pending" | "Valid" | "Errors" | "Warnings";

export interface HMDARecord {
  id: string;
  loan_id: string;
  activity_year: number;
  lei: string | null;
  uli: string | null;
  action_taken: HMDAActionTaken | null;
  action_taken_date: string | null;
  denial_reason_1: HMDADenialReason | null;
  denial_reason_2: HMDADenialReason | null;
  denial_reason_3: HMDADenialReason | null;
  denial_reason_4: HMDADenialReason | null;
  loan_purpose: string | null;
  loan_type: string | null;
  loan_amount: number | null;
  interest_rate: number | null;
  rate_spread: number | null;
  hoepa_status: string | null;
  lien_status: string | null;
  loan_term_months: number | null;
  property_type: string | null;
  occupancy_type: string | null;
  property_state: string | null;
  property_county: string | null;
  census_tract: string | null;
  applicant_ethnicity: string | null;
  applicant_race: string | null;
  applicant_sex: string | null;
  co_applicant_ethnicity: string | null;
  co_applicant_race: string | null;
  co_applicant_sex: string | null;
  applicant_income: number | null;
  dti_ratio: number | null;
  combined_ltv: number | null;
  validation_status: HMDAValidationStatus;
  validation_errors: string | null;
  application_date: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  loan_number: string | null;
  borrower_name: string | null;
  loan_status: LoanStatus | null;
}

export interface HMDAValidationResult {
  loan_id: string;
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Adverse Action ──────────────────────────────────────────────────────────

export type AdverseActionType =
  | "Denial"
  | "CounterofferDeclined"
  | "WithdrawalAfterCounteroffer"
  | "IncompleteApplication";

export const AdverseActionTypeLabels: Record<AdverseActionType, string> = {
  Denial: "Denial",
  CounterofferDeclined: "Counteroffer Declined",
  WithdrawalAfterCounteroffer: "Withdrawal After Counteroffer",
  IncompleteApplication: "Incomplete Application",
};

export type AdverseActionReasonCode =
  | "CreditApplicationIncomplete"
  | "InsufficientCreditReferences"
  | "UnableToVerifyCredit"
  | "TemporaryOrIrregularEmployment"
  | "UnableToVerifyEmployment"
  | "UnableToVerifyIncome"
  | "ExcessiveObligations"
  | "InsufficientIncome"
  | "InadequateCollateral"
  | "CreditHistoryDelinquent"
  | "InsufficientLengthEmployment"
  | "InsufficientLengthResidence"
  | "TooManyRecentInquiries"
  | "Bankruptcy"
  | "GarnishmentAttachment"
  | "ForeclosureRepossession"
  | "UnacceptableAppraisal"
  | "MortgageInsuranceDenied"
  | "Other";

export const AdverseActionReasonLabels: Record<AdverseActionReasonCode, string> = {
  CreditApplicationIncomplete: "Credit Application Incomplete",
  InsufficientCreditReferences: "Insufficient Credit References",
  UnableToVerifyCredit: "Unable to Verify Credit",
  TemporaryOrIrregularEmployment: "Temporary/Irregular Employment",
  UnableToVerifyEmployment: "Unable to Verify Employment",
  UnableToVerifyIncome: "Unable to Verify Income",
  ExcessiveObligations: "Excessive Obligations",
  InsufficientIncome: "Insufficient Income",
  InadequateCollateral: "Inadequate Collateral",
  CreditHistoryDelinquent: "Delinquent Credit History",
  InsufficientLengthEmployment: "Insufficient Length of Employment",
  InsufficientLengthResidence: "Insufficient Length of Residence",
  TooManyRecentInquiries: "Too Many Recent Inquiries",
  Bankruptcy: "Bankruptcy",
  GarnishmentAttachment: "Garnishment/Attachment",
  ForeclosureRepossession: "Foreclosure/Repossession",
  UnacceptableAppraisal: "Unacceptable Appraisal",
  MortgageInsuranceDenied: "Mortgage Insurance Denied",
  Other: "Other",
};

export type AdverseActionStatus = "Draft" | "PendingReview" | "Sent" | "Acknowledged";

export const AdverseActionStatusLabels: Record<AdverseActionStatus, string> = {
  Draft: "Draft",
  PendingReview: "Pending Review",
  Sent: "Sent",
  Acknowledged: "Acknowledged",
};

export interface AdverseActionNotice {
  id: string;
  loan_id: string;
  action_type: AdverseActionType;
  status: AdverseActionStatus;
  reason_code_1: AdverseActionReasonCode | null;
  reason_code_2: AdverseActionReasonCode | null;
  reason_code_3: AdverseActionReasonCode | null;
  reason_code_4: AdverseActionReasonCode | null;
  decision_date: string;
  notice_deadline: string;
  sent_date: string | null;
  delivery_method: string | null;
  notes: string | null;
  created_by_id: string | null;
  sent_by_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  loan_number: string | null;
  borrower_name: string | null;
}

export interface AdverseActionCreatePayload {
  action_type: AdverseActionType;
  reason_code_1?: AdverseActionReasonCode;
  reason_code_2?: AdverseActionReasonCode;
  reason_code_3?: AdverseActionReasonCode;
  reason_code_4?: AdverseActionReasonCode;
  decision_date: string;
  delivery_method?: string;
  notes?: string;
}

// ─── TRID Exceptions ─────────────────────────────────────────────────────────

export interface TRIDExceptionItem {
  loan_id: string;
  loan_number: string;
  borrower_name: string | null;
  loan_status: LoanStatus;
  le_issued_date: string | null;
  le_version: number;
  tolerance_category: string;
  le_total: number;
  cd_total: number | null;
  variance: number | null;
  threshold: number | null;
  is_violation: boolean;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export interface ComplianceDashboardStats {
  hmda_total_records: number;
  hmda_valid: number;
  hmda_errors: number;
  hmda_pending: number;
  aa_total: number;
  aa_pending_send: number;
  aa_overdue: number;
  aa_sent_this_month: number;
  trid_total_loans_with_le: number;
  trid_tolerance_exceptions: number;
  trid_le_deadline_approaching: number;
  loans_originated: number;
  loans_denied: number;
  loans_withdrawn: number;
  loans_in_process: number;
}

export enum LoanStatus {
  NEW = "New",
  IN_PROCESS = "InProcess",
  CONDITIONAL_APPROVAL = "ConditionalApproval",
  APPROVED = "Approved",
  SUSPENDED = "Suspended",
  DECLINED = "Declined",
  WITHDRAWN = "Withdrawn",
  FUNDED = "Funded",
}

export enum LoanPurposeType {
  PURCHASE = "Purchase",
  REFINANCE = "Refinance",
  CASH_OUT_REFINANCE = "CashOutRefinance",
  CONSTRUCTION_TO_PERMANENT = "ConstructionToPermanent",
}

export enum LoanType {
  CONVENTIONAL = "Conventional",
  FHA = "FHA",
  VA = "VA",
  USDA = "USDA",
}

export enum UserRole {
  LOAN_OFFICER = "LoanOfficer",
  PROCESSOR = "Processor",
  UNDERWRITER = "Underwriter",
  CLOSER = "Closer",
  SECONDARY_MARKETING = "SecondaryMarketing",
  BRANCH_MANAGER = "BranchManager",
  COMPLIANCE_OFFICER = "ComplianceOfficer",
  ADMIN = "Admin",
}

export enum DocumentStatus {
  REQUESTED = "Requested",
  RECEIVED = "Received",
  REVIEWED = "Reviewed",
  ACCEPTED = "Accepted",
  REJECTED = "Rejected",
}

export interface Borrower {
  id: string;
  loan_id: string;
  borrower_classification: "Primary" | "CoBorrower";
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  phone: string;
  credit_score?: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  loan_id: string;
  document_type: string;
  document_status: DocumentStatus;
  s3_key?: string;
  original_filename: string;
  uploaded_by_id?: string;
  reviewed_by_id?: string;
  uploaded_at?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface AUSResult {
  id: string;
  loan_id: string;
  system: "DU" | "LPA";
  recommendation: string;
  risk_class: string;
  findings_summary: string;
  run_at: string;
  raw_response?: Record<string, unknown>;
}

export interface LoanListItem {
  id: string;
  loan_number: string;
  status: LoanStatus;
  loan_amount: number;
  loan_purpose_type: LoanPurposeType;
  loan_type: LoanType;
  property_city: string;
  property_state: string;
  created_at: string;
  primary_borrower_name?: string;
  assigned_lo_name?: string;
  days_in_status?: number;
}

export interface Loan {
  id: string;
  loan_number: string;
  status: LoanStatus;
  loan_purpose_type: LoanPurposeType;
  loan_type: LoanType;
  loan_amount: number;
  note_rate_percent?: number;
  property_address_line: string;
  property_city: string;
  property_state: string;
  property_zip: string;
  property_county?: string;
  created_by_id: string;
  assigned_lo_id?: string;
  assigned_processor_id?: string;
  assigned_underwriter_id?: string;
  mismo_data?: Record<string, unknown>;
  application_received_date?: string;
  estimated_close_date?: string;
  created_at: string;
  updated_at: string;
  borrowers: Borrower[];
  documents?: Document[];
}

export interface LoanCreatePayload {
  loan_purpose_type: LoanPurposeType;
  loan_type: LoanType;
  loan_amount: number;
  property_address_line: string;
  property_city: string;
  property_state: string;
  property_zip: string;
}

export interface LoanUpdatePayload {
  status?: LoanStatus;
  loan_amount?: number;
  note_rate_percent?: number;
  application_received_date?: string; // YYYY-MM-DD
  estimated_close_date?: string;
  assigned_lo_id?: string;
  assigned_processor_id?: string;
  assigned_underwriter_id?: string;
}

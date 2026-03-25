export enum LEStatus {
  DRAFT = "Draft",
  ISSUED = "Issued",
  REVISED = "Revised",
  SUPERSEDED = "Superseded",
}

export enum RespaSection {
  A = "A", // Origination charges — zero tolerance
  B = "B", // Services borrower cannot shop for — zero tolerance
  C = "C", // Services borrower can shop for — 10% tolerance
  E = "E", // Taxes and other government fees — zero tolerance
  F = "F", // Prepaids — unlimited tolerance
  G = "G", // Initial escrow payment — unlimited tolerance
  H = "H", // Other — unlimited tolerance
}

export enum ToleranceCategory {
  ZERO = "Zero",
  TEN_PERCENT = "TenPercent",
  UNLIMITED = "Unlimited",
}

export enum PaidBy {
  BORROWER = "Borrower",
  SELLER = "Seller",
  LENDER = "Lender",
  OTHER = "Other",
}

export enum COCReason {
  ACTS_OF_GOD = "ActsOfGod",
  BORROWER_REQUESTED = "BorrowerRequested",
  RATE_LOCK = "RateLock",
  NEW_INFORMATION = "NewInformation",
  CREDIT_DENIAL = "CreditDenial",
  DELAYED_SETTLEMENT = "DelayedSettlement",
}

export const COC_REASON_LABELS: Record<COCReason, string> = {
  [COCReason.ACTS_OF_GOD]: "Acts of God / Natural Disaster",
  [COCReason.BORROWER_REQUESTED]: "Borrower-Requested Change",
  [COCReason.RATE_LOCK]: "Rate Lock",
  [COCReason.NEW_INFORMATION]: "New Information Discovered",
  [COCReason.CREDIT_DENIAL]: "Credit Denial or Withdrawal",
  [COCReason.DELAYED_SETTLEMENT]: "Delayed Settlement (New Construction)",
};

export const RESPA_SECTION_LABELS: Record<RespaSection, string> = {
  [RespaSection.A]: "A — Origination Charges",
  [RespaSection.B]: "B — Services (Cannot Shop)",
  [RespaSection.C]: "C — Services (Can Shop)",
  [RespaSection.E]: "E — Taxes & Government Fees",
  [RespaSection.F]: "F — Prepaids",
  [RespaSection.G]: "G — Initial Escrow Payment",
  [RespaSection.H]: "H — Other",
};

export const SECTION_TOLERANCE_LABELS: Record<RespaSection, string> = {
  [RespaSection.A]: "Zero Tolerance",
  [RespaSection.B]: "Zero Tolerance",
  [RespaSection.C]: "10% Tolerance",
  [RespaSection.E]: "Zero Tolerance",
  [RespaSection.F]: "Unlimited",
  [RespaSection.G]: "Unlimited",
  [RespaSection.H]: "Unlimited",
};

// Default fee templates per RESPA section for quick entry
export const DEFAULT_FEES: Array<{
  respa_section: RespaSection;
  fee_name: string;
  fee_amount: number;
  paid_to?: string;
  is_finance_charge: boolean;
}> = [
  // Section A — Origination
  { respa_section: RespaSection.A, fee_name: "Origination Fee", fee_amount: 0, paid_to: "Lender", is_finance_charge: true },
  { respa_section: RespaSection.A, fee_name: "Underwriting Fee", fee_amount: 995, paid_to: "Lender", is_finance_charge: true },
  // Section B — Cannot Shop
  { respa_section: RespaSection.B, fee_name: "Appraisal Fee", fee_amount: 550, paid_to: "Appraiser", is_finance_charge: false },
  { respa_section: RespaSection.B, fee_name: "Credit Report Fee", fee_amount: 65, paid_to: "Credit Bureau", is_finance_charge: true },
  { respa_section: RespaSection.B, fee_name: "Flood Determination Fee", fee_amount: 12, paid_to: "Flood Vendor", is_finance_charge: true },
  { respa_section: RespaSection.B, fee_name: "Tax Monitoring Fee", fee_amount: 75, paid_to: "Tax Service", is_finance_charge: true },
  // Section C — Can Shop
  { respa_section: RespaSection.C, fee_name: "Title – Settlement Agent Fee", fee_amount: 595, paid_to: "Title Company", is_finance_charge: false },
  { respa_section: RespaSection.C, fee_name: "Title – Lender's Title Insurance", fee_amount: 0, paid_to: "Title Company", is_finance_charge: false },
  // Section E — Government Fees
  { respa_section: RespaSection.E, fee_name: "Recording Fees", fee_amount: 125, paid_to: "County Recorder", is_finance_charge: false },
  { respa_section: RespaSection.E, fee_name: "Transfer Tax", fee_amount: 0, paid_to: "County/State", is_finance_charge: false },
  // Section F — Prepaids
  { respa_section: RespaSection.F, fee_name: "Homeowner's Insurance Premium (12 mo.)", fee_amount: 0, is_finance_charge: false },
  { respa_section: RespaSection.F, fee_name: "Prepaid Interest", fee_amount: 0, paid_to: "Lender", is_finance_charge: true },
  { respa_section: RespaSection.F, fee_name: "Mortgage Insurance Premium", fee_amount: 0, paid_to: "MI Company", is_finance_charge: false },
  // Section G — Initial Escrow
  { respa_section: RespaSection.G, fee_name: "Homeowner's Insurance (2 mo. escrow)", fee_amount: 0, is_finance_charge: false },
  { respa_section: RespaSection.G, fee_name: "Property Taxes (2 mo. escrow)", fee_amount: 0, is_finance_charge: false },
];

export interface LoanEstimateFee {
  id: string;
  loan_estimate_id: string;
  respa_section: RespaSection;
  fee_name: string;
  fee_amount: number;
  tolerance_category: ToleranceCategory;
  paid_by: PaidBy;
  paid_to?: string;
  is_finance_charge: boolean;
  sort_order: number;
}

export interface LoanEstimate {
  id: string;
  loan_id: string;
  version_number: number;
  status: LEStatus;
  issued_date?: string;
  delivery_date?: string;
  trid_deadline?: string;
  revision_reason?: string;
  coc_reason?: COCReason;
  supersedes_le_id?: string;

  // Loan terms
  loan_amount: number;
  loan_term_months: number;
  note_rate_percent?: number;
  apr_percent?: number;

  // Projected payments
  monthly_principal_interest?: number;
  monthly_mortgage_insurance?: number;
  monthly_escrow_amount?: number;
  total_monthly_payment?: number;

  // Costs
  total_loan_costs?: number;
  total_other_costs?: number;
  lender_credits: number;
  total_closing_costs?: number;

  // Cash to close
  purchase_price?: number;
  down_payment?: number;
  deposit: number;
  seller_credits: number;
  cash_to_close?: number;

  issued_by_id?: string;
  created_at: string;
  updated_at: string;
  fees: LoanEstimateFee[];
}

export interface LoanEstimateListItem {
  id: string;
  loan_id: string;
  version_number: number;
  status: LEStatus;
  issued_date?: string;
  trid_deadline?: string;
  note_rate_percent?: number;
  apr_percent?: number;
  total_closing_costs?: number;
  cash_to_close?: number;
  total_monthly_payment?: number;
  created_at: string;
}

export interface TRIDStatus {
  loan_id: string;
  application_date?: string;
  le_deadline?: string;
  days_until_deadline?: number;
  le_issued: boolean;
  le_issued_date?: string;
  earliest_closing_date?: string;
  latest_le_version: number;
  tolerance_ok: boolean;
}

// API payload types
export interface LoanEstimateFeeCreate {
  respa_section: RespaSection;
  fee_name: string;
  fee_amount: number;
  paid_by: PaidBy;
  paid_to?: string;
  is_finance_charge: boolean;
  sort_order?: number;
}

export interface LoanEstimateCreatePayload {
  loan_term_months: number;
  note_rate_percent?: number;
  monthly_mortgage_insurance?: number;
  monthly_escrow_amount?: number;
  purchase_price?: number;
  deposit: number;
  seller_credits: number;
  lender_credits: number;
  fees: LoanEstimateFeeCreate[];
}

export interface LoanEstimateUpdatePayload {
  note_rate_percent?: number;
  loan_term_months?: number;
  monthly_mortgage_insurance?: number;
  monthly_escrow_amount?: number;
  purchase_price?: number;
  deposit?: number;
  seller_credits?: number;
  lender_credits?: number;
}

export interface IssuePayload {
  issued_date: string;
  delivery_date?: string;
}

export interface RevisePayload {
  coc_reason: COCReason;
  revision_reason: string;
  note_rate_percent?: number;
  loan_term_months?: number;
  monthly_mortgage_insurance?: number;
  monthly_escrow_amount?: number;
  lender_credits?: number;
  fees: LoanEstimateFeeCreate[];
}

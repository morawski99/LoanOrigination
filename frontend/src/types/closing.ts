import type { RespaSection, PaidBy } from "./loan_estimate";

// ── Enums ────────────────────────────────────────────────────────────────────

export enum CDStatus {
  DRAFT = "Draft",
  ISSUED = "Issued",
  REVISED = "Revised",
  SUPERSEDED = "Superseded",
}

export enum ChecklistCategory {
  TITLE = "Title",
  INSURANCE = "Insurance",
  COMPLIANCE = "Compliance",
  FUNDING = "Funding",
  OTHER = "Other",
}

export enum ChecklistItemStatus {
  PENDING = "Pending",
  COMPLETE = "Complete",
  NA = "NA",
}

export enum FundingStatusType {
  NOT_READY = "NotReady",
  SCHEDULED = "Scheduled",
  FUNDED = "Funded",
  SUSPENDED = "Suspended",
}

export const CHECKLIST_CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  [ChecklistCategory.TITLE]: "Title & Settlement",
  [ChecklistCategory.INSURANCE]: "Insurance",
  [ChecklistCategory.COMPLIANCE]: "Compliance",
  [ChecklistCategory.FUNDING]: "Funding",
  [ChecklistCategory.OTHER]: "Other",
};

export const FUNDING_STATUS_LABELS: Record<FundingStatusType, string> = {
  [FundingStatusType.NOT_READY]: "Not Ready",
  [FundingStatusType.SCHEDULED]: "Scheduled",
  [FundingStatusType.FUNDED]: "Funded",
  [FundingStatusType.SUSPENDED]: "Suspended",
};

// ── Closing Disclosure ───────────────────────────────────────────────────────

export interface ClosingDisclosureFee {
  id: string;
  closing_disclosure_id: string;
  respa_section: RespaSection;
  fee_name: string;
  fee_amount: number;
  tolerance_category: string;
  paid_by: PaidBy;
  paid_to?: string;
  is_finance_charge: boolean;
  sort_order: number;
}

export interface ClosingDisclosure {
  id: string;
  loan_id: string;
  version_number: number;
  status: CDStatus;
  issued_date?: string;
  delivery_date?: string;
  closing_date?: string;
  disbursement_date?: string;
  cd_delivery_deadline?: string;
  linked_le_id?: string;
  revision_reason?: string;
  supersedes_cd_id?: string;

  loan_amount: number;
  loan_term_months: number;
  note_rate_percent?: number;
  apr_percent?: number;

  monthly_principal_interest?: number;
  monthly_mortgage_insurance?: number;
  monthly_escrow_amount?: number;
  total_monthly_payment?: number;

  total_loan_costs?: number;
  total_other_costs?: number;
  lender_credits: number;
  total_closing_costs?: number;

  purchase_price?: number;
  down_payment?: number;
  deposit: number;
  seller_credits: number;
  cash_to_close?: number;

  issued_by_id?: string;
  created_at: string;
  updated_at: string;
  fees: ClosingDisclosureFee[];
}

export interface CDListItem {
  id: string;
  loan_id: string;
  version_number: number;
  status: CDStatus;
  issued_date?: string;
  closing_date?: string;
  cd_delivery_deadline?: string;
  note_rate_percent?: number;
  apr_percent?: number;
  total_closing_costs?: number;
  cash_to_close?: number;
  total_monthly_payment?: number;
  created_at: string;
}

export interface CDFeeCreate {
  respa_section: RespaSection;
  fee_name: string;
  fee_amount: number;
  paid_by: PaidBy;
  paid_to?: string;
  is_finance_charge: boolean;
  sort_order?: number;
}

export interface CDCreatePayload {
  loan_term_months: number;
  note_rate_percent?: number;
  monthly_mortgage_insurance?: number;
  monthly_escrow_amount?: number;
  purchase_price?: number;
  deposit: number;
  seller_credits: number;
  lender_credits: number;
  closing_date?: string;
  disbursement_date?: string;
  fees: CDFeeCreate[];
}

export interface CDUpdatePayload {
  note_rate_percent?: number;
  loan_term_months?: number;
  monthly_mortgage_insurance?: number;
  monthly_escrow_amount?: number;
  purchase_price?: number;
  deposit?: number;
  seller_credits?: number;
  lender_credits?: number;
  closing_date?: string;
  disbursement_date?: string;
}

export interface CDIssuePayload {
  issued_date: string;
  delivery_date?: string;
}

// ── Tolerance Check ──────────────────────────────────────────────────────────

export interface ToleranceViolation {
  fee_name: string;
  original: number;
  revised: number;
  increase: number;
}

export interface ToleranceCheckResult {
  zero_violations: ToleranceViolation[];
  ten_pct_bucket_original: number;
  ten_pct_bucket_revised: number;
  ten_pct_exceeded: boolean;
  cure_amount: number;
}

// ── Closing Checklist ────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  loan_id: string;
  category: ChecklistCategory;
  status: ChecklistItemStatus;
  description: string;
  due_date?: string;
  completed_date?: string;
  assigned_to?: string;
  notes?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItemCreatePayload {
  category: ChecklistCategory;
  description: string;
  due_date?: string;
  assigned_to?: string;
  notes?: string;
  sort_order?: number;
}

export interface ChecklistItemUpdatePayload {
  category?: ChecklistCategory;
  status?: ChecklistItemStatus;
  description?: string;
  due_date?: string;
  completed_date?: string;
  assigned_to?: string;
  notes?: string;
  sort_order?: number;
}

// ── Wire Instructions ────────────────────────────────────────────────────────

export interface WireInstruction {
  id: string;
  loan_id: string;
  beneficiary_name: string;
  beneficiary_address?: string;
  bank_name: string;
  aba_routing_number: string;
  account_number: string;
  reference_number?: string;
  special_instructions?: string;
  verified: boolean;
  verified_by_id?: string;
  created_at: string;
  updated_at: string;
}

export interface WireInstructionPayload {
  beneficiary_name: string;
  beneficiary_address?: string;
  bank_name: string;
  aba_routing_number: string;
  account_number: string;
  reference_number?: string;
  special_instructions?: string;
}

// ── Funding Status ───────────────────────────────────────────────────────────

export interface FundingStatusData {
  id: string;
  loan_id: string;
  status: FundingStatusType;
  scheduled_date?: string;
  funded_date?: string;
  funded_amount?: number;
  confirmation_number?: string;
  funding_source?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FundingStatusPayload {
  status: FundingStatusType;
  scheduled_date?: string;
  funded_date?: string;
  funded_amount?: number;
  confirmation_number?: string;
  funding_source?: string;
  notes?: string;
}

// ── Default Checklist Items ──────────────────────────────────────────────────

export const DEFAULT_CHECKLIST_ITEMS: Array<{
  category: ChecklistCategory;
  description: string;
}> = [
  { category: ChecklistCategory.TITLE, description: "Title commitment received and reviewed" },
  { category: ChecklistCategory.TITLE, description: "Title exceptions cleared" },
  { category: ChecklistCategory.TITLE, description: "Settlement agent confirmed" },
  { category: ChecklistCategory.TITLE, description: "Closing date/time confirmed with all parties" },
  { category: ChecklistCategory.INSURANCE, description: "Homeowner's insurance binder received" },
  { category: ChecklistCategory.INSURANCE, description: "Flood insurance confirmation (if required)" },
  { category: ChecklistCategory.INSURANCE, description: "Mortgage insurance certificate (if applicable)" },
  { category: ChecklistCategory.COMPLIANCE, description: "Closing Disclosure issued to borrower" },
  { category: ChecklistCategory.COMPLIANCE, description: "3-day CD waiting period satisfied" },
  { category: ChecklistCategory.COMPLIANCE, description: "Final TRID tolerance check — no cure needed" },
  { category: ChecklistCategory.COMPLIANCE, description: "Right of rescission period clear (refi only)" },
  { category: ChecklistCategory.FUNDING, description: "Final underwriting approval (clear to close)" },
  { category: ChecklistCategory.FUNDING, description: "Loan documents drawn and reviewed" },
  { category: ChecklistCategory.FUNDING, description: "Borrower signed closing package" },
  { category: ChecklistCategory.FUNDING, description: "Wire instructions verified" },
  { category: ChecklistCategory.FUNDING, description: "Funding authorization issued" },
];

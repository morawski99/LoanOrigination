import axios, { AxiosInstance, AxiosResponse } from "axios";
import type {
  Loan,
  LoanListItem,
  LoanCreatePayload,
  LoanUpdatePayload,
  Condition,
  ConditionCreatePayload,
  ConditionUpdatePayload,
  AUSResult,
  AUSResultCreatePayload,
  UnderwritingQueueItem,
  UnderwritingQueueStats,
  UnderwritingDecisionPayload,
  UnderwritingDecision,
} from "@/types/loan";
import type { UserResponse, UserCreatePayload, UserUpdatePayload } from "@/types/user";
import type {
  ClosingDisclosure,
  CDListItem,
  CDCreatePayload,
  CDUpdatePayload,
  CDIssuePayload,
  CDFeeCreate,
  ToleranceCheckResult,
  ChecklistItem,
  ChecklistItemCreatePayload,
  ChecklistItemUpdatePayload,
  WireInstruction,
  WireInstructionPayload,
  FundingStatusData,
  FundingStatusPayload,
} from "@/types/closing";
import type {
  LoanEstimate,
  LoanEstimateListItem,
  TRIDStatus,
  LoanEstimateCreatePayload,
  LoanEstimateUpdatePayload,
  IssuePayload,
  RevisePayload,
  LoanEstimateFeeCreate,
} from "@/types/loan_estimate";
import type {
  URLAProgress,
  FullBorrower,
  BorrowerPersonalInfo,
  BorrowerResidence,
  ResidenceCreate,
  BorrowerEmployment,
  EmploymentCreate,
  OtherIncome,
  OtherIncomeCreate,
  BorrowerAsset,
  AssetCreate,
  BorrowerLiability,
  LiabilityCreate,
  RealEstateOwned,
  REOCreate,
  BorrowerDeclaration,
  DeclarationUpsert,
  MilitaryService,
  MilitaryServiceUpsert,
  BorrowerDemographics,
  DemographicsUpsert,
} from "@/types/urla";

const BASE_URL =
  import.meta.env.VITE_API_URL ?? "/api/v1";

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor: inject Bearer token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: 401 → clear token + redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface LoansQueryParams {
  skip?: number;
  limit?: number;
  status?: string;
  loan_type?: string;
  assigned_lo_id?: string;
  unassigned_only?: boolean;
  search?: string;
}

// Auth
export async function login(
  email: string,
  password: string
): Promise<{ access_token: string; token_type: string }> {
  const response: AxiosResponse<{ access_token: string; token_type: string }> =
    await apiClient.post("/auth/token", { email, password });
  return response.data;
}

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}> {
  const response = await apiClient.get("/auth/me");
  return response.data;
}

// Loans
export async function getLoans(
  params?: LoansQueryParams
): Promise<PaginatedResponse<LoanListItem>> {
  const response: AxiosResponse<PaginatedResponse<LoanListItem>> =
    await apiClient.get("/loans", { params });
  return response.data;
}

export async function getLoan(id: string): Promise<Loan> {
  const response: AxiosResponse<Loan> = await apiClient.get(`/loans/${id}`);
  return response.data;
}

export async function createLoan(data: LoanCreatePayload): Promise<Loan> {
  const response: AxiosResponse<Loan> = await apiClient.post("/loans", data);
  return response.data;
}

export async function updateLoan(
  id: string,
  data: LoanUpdatePayload
): Promise<Loan> {
  const response: AxiosResponse<Loan> = await apiClient.patch(
    `/loans/${id}`,
    data
  );
  return response.data;
}

export interface BorrowerCreatePayload {
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  phone: string;
  borrower_classification?: string;
}

export async function createBorrower(
  loanId: string,
  data: BorrowerCreatePayload
): Promise<import("@/types/loan").Borrower> {
  const response = await apiClient.post(`/loans/${loanId}/borrowers`, data);
  return response.data;
}

// ─── URLA ────────────────────────────────────────────────────────────────────

export async function getURLAProgress(loanId: string): Promise<URLAProgress> {
  const response: AxiosResponse<URLAProgress> = await apiClient.get(
    `/loans/${loanId}/urla/progress`
  );
  return response.data;
}

export async function getFullBorrower(
  loanId: string,
  borrowerId: string
): Promise<FullBorrower> {
  const response: AxiosResponse<FullBorrower> = await apiClient.get(
    `/loans/${loanId}/borrowers/${borrowerId}/full`
  );
  return response.data;
}

export async function updatePersonalInfo(
  loanId: string,
  borrowerId: string,
  data: Partial<BorrowerPersonalInfo>
): Promise<void> {
  await apiClient.patch(
    `/loans/${loanId}/borrowers/${borrowerId}/personal-info`,
    data
  );
}

// Residences
export async function createResidence(
  loanId: string,
  borrowerId: string,
  data: ResidenceCreate
): Promise<BorrowerResidence> {
  const response: AxiosResponse<BorrowerResidence> = await apiClient.post(
    `/loans/${loanId}/borrowers/${borrowerId}/residences`,
    data
  );
  return response.data;
}

export async function updateResidence(
  loanId: string,
  borrowerId: string,
  residenceId: string,
  data: Partial<ResidenceCreate>
): Promise<BorrowerResidence> {
  const response: AxiosResponse<BorrowerResidence> = await apiClient.patch(
    `/loans/${loanId}/borrowers/${borrowerId}/residences/${residenceId}`,
    data
  );
  return response.data;
}

export async function deleteResidence(
  loanId: string,
  borrowerId: string,
  residenceId: string
): Promise<void> {
  await apiClient.delete(
    `/loans/${loanId}/borrowers/${borrowerId}/residences/${residenceId}`
  );
}

// Employment
export async function createEmployment(
  loanId: string,
  borrowerId: string,
  data: EmploymentCreate
): Promise<BorrowerEmployment> {
  const response: AxiosResponse<BorrowerEmployment> = await apiClient.post(
    `/loans/${loanId}/borrowers/${borrowerId}/employments`,
    data
  );
  return response.data;
}

export async function updateEmployment(
  loanId: string,
  borrowerId: string,
  employmentId: string,
  data: Partial<EmploymentCreate>
): Promise<BorrowerEmployment> {
  const response: AxiosResponse<BorrowerEmployment> = await apiClient.patch(
    `/loans/${loanId}/borrowers/${borrowerId}/employments/${employmentId}`,
    data
  );
  return response.data;
}

export async function deleteEmployment(
  loanId: string,
  borrowerId: string,
  employmentId: string
): Promise<void> {
  await apiClient.delete(
    `/loans/${loanId}/borrowers/${borrowerId}/employments/${employmentId}`
  );
}

// Other Income
export async function createOtherIncome(
  loanId: string,
  borrowerId: string,
  data: OtherIncomeCreate
): Promise<OtherIncome> {
  const response: AxiosResponse<OtherIncome> = await apiClient.post(
    `/loans/${loanId}/borrowers/${borrowerId}/other-incomes`,
    data
  );
  return response.data;
}

export async function deleteOtherIncome(
  loanId: string,
  borrowerId: string,
  incomeId: string
): Promise<void> {
  await apiClient.delete(
    `/loans/${loanId}/borrowers/${borrowerId}/other-incomes/${incomeId}`
  );
}

// Assets
export async function createAsset(
  loanId: string,
  borrowerId: string,
  data: AssetCreate
): Promise<BorrowerAsset> {
  const response: AxiosResponse<BorrowerAsset> = await apiClient.post(
    `/loans/${loanId}/borrowers/${borrowerId}/assets`,
    data
  );
  return response.data;
}

export async function updateAsset(
  loanId: string,
  borrowerId: string,
  assetId: string,
  data: Partial<AssetCreate>
): Promise<BorrowerAsset> {
  const response: AxiosResponse<BorrowerAsset> = await apiClient.patch(
    `/loans/${loanId}/borrowers/${borrowerId}/assets/${assetId}`,
    data
  );
  return response.data;
}

export async function deleteAsset(
  loanId: string,
  borrowerId: string,
  assetId: string
): Promise<void> {
  await apiClient.delete(
    `/loans/${loanId}/borrowers/${borrowerId}/assets/${assetId}`
  );
}

// Liabilities
export async function createLiability(
  loanId: string,
  borrowerId: string,
  data: LiabilityCreate
): Promise<BorrowerLiability> {
  const response: AxiosResponse<BorrowerLiability> = await apiClient.post(
    `/loans/${loanId}/borrowers/${borrowerId}/liabilities`,
    data
  );
  return response.data;
}

export async function updateLiability(
  loanId: string,
  borrowerId: string,
  liabilityId: string,
  data: Partial<LiabilityCreate>
): Promise<BorrowerLiability> {
  const response: AxiosResponse<BorrowerLiability> = await apiClient.patch(
    `/loans/${loanId}/borrowers/${borrowerId}/liabilities/${liabilityId}`,
    data
  );
  return response.data;
}

export async function deleteLiability(
  loanId: string,
  borrowerId: string,
  liabilityId: string
): Promise<void> {
  await apiClient.delete(
    `/loans/${loanId}/borrowers/${borrowerId}/liabilities/${liabilityId}`
  );
}

// Real Estate Owned
export async function createREO(
  loanId: string,
  borrowerId: string,
  data: REOCreate
): Promise<RealEstateOwned> {
  const response: AxiosResponse<RealEstateOwned> = await apiClient.post(
    `/loans/${loanId}/borrowers/${borrowerId}/reo`,
    data
  );
  return response.data;
}

export async function updateREO(
  loanId: string,
  borrowerId: string,
  reoId: string,
  data: Partial<REOCreate>
): Promise<RealEstateOwned> {
  const response: AxiosResponse<RealEstateOwned> = await apiClient.patch(
    `/loans/${loanId}/borrowers/${borrowerId}/reo/${reoId}`,
    data
  );
  return response.data;
}

export async function deleteREO(
  loanId: string,
  borrowerId: string,
  reoId: string
): Promise<void> {
  await apiClient.delete(
    `/loans/${loanId}/borrowers/${borrowerId}/reo/${reoId}`
  );
}

// Declarations (upsert)
export async function upsertDeclarations(
  loanId: string,
  borrowerId: string,
  data: DeclarationUpsert
): Promise<BorrowerDeclaration> {
  const response: AxiosResponse<BorrowerDeclaration> = await apiClient.put(
    `/loans/${loanId}/borrowers/${borrowerId}/declarations`,
    data
  );
  return response.data;
}

// Military Service (upsert)
export async function upsertMilitaryService(
  loanId: string,
  borrowerId: string,
  data: MilitaryServiceUpsert
): Promise<MilitaryService> {
  const response: AxiosResponse<MilitaryService> = await apiClient.put(
    `/loans/${loanId}/borrowers/${borrowerId}/military-service`,
    data
  );
  return response.data;
}

// Demographics (upsert)
export async function upsertDemographics(
  loanId: string,
  borrowerId: string,
  data: DemographicsUpsert
): Promise<BorrowerDemographics> {
  const response: AxiosResponse<BorrowerDemographics> = await apiClient.put(
    `/loans/${loanId}/borrowers/${borrowerId}/demographics`,
    data
  );
  return response.data;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getAssignableUsers(role?: string): Promise<UserResponse[]> {
  const response: AxiosResponse<UserResponse[]> = await apiClient.get(
    "/users/assignable",
    { params: role ? { role } : undefined }
  );
  return response.data;
}

export interface UsersQueryParams {
  skip?: number;
  limit?: number;
  role?: string;
  is_active?: boolean;
  search?: string;
}

export async function getUsers(
  params?: UsersQueryParams
): Promise<PaginatedResponse<UserResponse>> {
  const response: AxiosResponse<PaginatedResponse<UserResponse>> =
    await apiClient.get("/users", { params });
  return response.data;
}

export async function createUser(
  data: UserCreatePayload
): Promise<UserResponse> {
  const response: AxiosResponse<UserResponse> = await apiClient.post(
    "/users",
    data
  );
  return response.data;
}

export async function updateUser(
  userId: string,
  data: UserUpdatePayload
): Promise<UserResponse> {
  const response: AxiosResponse<UserResponse> = await apiClient.patch(
    `/users/${userId}`,
    data
  );
  return response.data;
}

export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  await apiClient.post(`/users/${userId}/reset-password`, {
    new_password: newPassword,
  });
}

// ─── Loan Estimates ──────────────────────────────────────────────────────────

export async function getLoanEstimates(
  loanId: string
): Promise<LoanEstimateListItem[]> {
  const response: AxiosResponse<LoanEstimateListItem[]> = await apiClient.get(
    `/loans/${loanId}/loan-estimates`
  );
  return response.data;
}

export async function getLoanEstimate(
  loanId: string,
  leId: string
): Promise<LoanEstimate> {
  const response: AxiosResponse<LoanEstimate> = await apiClient.get(
    `/loans/${loanId}/loan-estimates/${leId}`
  );
  return response.data;
}

export async function createLoanEstimate(
  loanId: string,
  data: LoanEstimateCreatePayload
): Promise<LoanEstimate> {
  const response: AxiosResponse<LoanEstimate> = await apiClient.post(
    `/loans/${loanId}/loan-estimates`,
    data
  );
  return response.data;
}

export async function updateLoanEstimate(
  loanId: string,
  leId: string,
  data: LoanEstimateUpdatePayload
): Promise<LoanEstimate> {
  const response: AxiosResponse<LoanEstimate> = await apiClient.patch(
    `/loans/${loanId}/loan-estimates/${leId}`,
    data
  );
  return response.data;
}

export async function replaceLEFees(
  loanId: string,
  leId: string,
  fees: LoanEstimateFeeCreate[]
): Promise<LoanEstimate> {
  const response: AxiosResponse<LoanEstimate> = await apiClient.put(
    `/loans/${loanId}/loan-estimates/${leId}/fees`,
    { fees }
  );
  return response.data;
}

export async function issueLoanEstimate(
  loanId: string,
  leId: string,
  data: IssuePayload
): Promise<LoanEstimate> {
  const response: AxiosResponse<LoanEstimate> = await apiClient.post(
    `/loans/${loanId}/loan-estimates/${leId}/issue`,
    data
  );
  return response.data;
}

export async function reviseLoanEstimate(
  loanId: string,
  leId: string,
  data: RevisePayload
): Promise<LoanEstimate> {
  const response: AxiosResponse<LoanEstimate> = await apiClient.post(
    `/loans/${loanId}/loan-estimates/${leId}/revise`,
    data
  );
  return response.data;
}

export async function getTRIDStatus(loanId: string): Promise<TRIDStatus> {
  const response: AxiosResponse<TRIDStatus> = await apiClient.get(
    `/loans/${loanId}/loan-estimates/trid-status`
  );
  return response.data;
}

// ─── AUS Results ─────────────────────────────────────────────────────────────

export async function getAUSResults(loanId: string): Promise<AUSResult[]> {
  const response: AxiosResponse<AUSResult[]> = await apiClient.get(
    `/loans/${loanId}/aus-results`
  );
  return response.data;
}

export async function createAUSResult(
  loanId: string,
  data: AUSResultCreatePayload
): Promise<AUSResult> {
  const response: AxiosResponse<AUSResult> = await apiClient.post(
    `/loans/${loanId}/aus-results`,
    data
  );
  return response.data;
}

export async function deleteAUSResult(
  loanId: string,
  resultId: string
): Promise<void> {
  await apiClient.delete(`/loans/${loanId}/aus-results/${resultId}`);
}

// ─── Conditions ──────────────────────────────────────────────────────────────

export async function getConditions(loanId: string): Promise<Condition[]> {
  const response: AxiosResponse<Condition[]> = await apiClient.get(
    `/loans/${loanId}/conditions`
  );
  return response.data;
}

export async function createCondition(
  loanId: string,
  data: ConditionCreatePayload
): Promise<Condition> {
  const response: AxiosResponse<Condition> = await apiClient.post(
    `/loans/${loanId}/conditions`,
    data
  );
  return response.data;
}

export async function updateCondition(
  loanId: string,
  conditionId: string,
  data: ConditionUpdatePayload
): Promise<Condition> {
  const response: AxiosResponse<Condition> = await apiClient.patch(
    `/loans/${loanId}/conditions/${conditionId}`,
    data
  );
  return response.data;
}

export async function deleteCondition(
  loanId: string,
  conditionId: string
): Promise<void> {
  await apiClient.delete(`/loans/${loanId}/conditions/${conditionId}`);
}


// ─── Documents ───────────────────────────────────────────────────────────────

export async function getDocuments(loanId: string) {
  const response = await apiClient.get(`/loans/${loanId}/documents`);
  return response.data;
}

export async function createDocument(
  loanId: string,
  payload: { document_type: string; original_filename: string }
) {
  const response = await apiClient.post(`/loans/${loanId}/documents`, payload);
  return response.data;
}

export async function updateDocument(
  loanId: string,
  documentId: string,
  payload: { document_status?: string; s3_key?: string }
) {
  const response = await apiClient.patch(
    `/loans/${loanId}/documents/${documentId}`,
    payload
  );
  return response.data;
}

export async function deleteDocument(
  loanId: string,
  documentId: string
): Promise<void> {
  await apiClient.delete(`/loans/${loanId}/documents/${documentId}`);
}

export async function uploadDocumentFile(
  loanId: string,
  documentId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  // Get a presigned upload URL
  const { upload_url, s3_key } = await getDocumentUploadUrl(
    loanId,
    file.name,
    file.type || "application/octet-stream"
  );
  // Upload the file directly to S3
  await axios.put(upload_url, file, {
    headers: { "Content-Type": file.type || "application/octet-stream" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  // Update the document record with the S3 key
  await updateDocument(loanId, documentId, { s3_key });
}

export function getDocumentFileUrl(
  loanId: string,
  documentId: string
): string {
  return `${BASE_URL}/loans/${loanId}/documents/${documentId}/download-url`;
}

export async function getDocumentUploadUrl(
  loanId: string,
  filename: string,
  contentType: string
): Promise<{ upload_url: string; s3_key: string; expires_in_seconds: number }> {
  const response = await apiClient.get(
    `/loans/${loanId}/documents/upload-url`,
    {
      params: { filename, content_type: contentType },
    }
  );
  return response.data;
}

export async function getDocumentDownloadUrl(
  loanId: string,
  documentId: string
): Promise<{ download_url: string; expires_in_seconds: number }> {
  const response = await apiClient.get(
    `/loans/${loanId}/documents/${documentId}/download-url`
  );
  return response.data;
}

// ─── Underwriting ─────────────────────────────────────────────────────────────

export interface UnderwritingQueryParams {
  skip?: number;
  limit?: number;
  status?: string;
  loan_type?: string;
  assigned_underwriter_id?: string;
  unassigned_only?: boolean;
  search?: string;
}

export async function getUnderwritingQueue(
  params?: UnderwritingQueryParams
): Promise<PaginatedResponse<UnderwritingQueueItem>> {
  const response: AxiosResponse<PaginatedResponse<UnderwritingQueueItem>> =
    await apiClient.get("/underwriting/queue", { params });
  return response.data;
}

export async function getUnderwritingStats(): Promise<UnderwritingQueueStats> {
  const response: AxiosResponse<UnderwritingQueueStats> =
    await apiClient.get("/underwriting/queue/stats");
  return response.data;
}

export async function assignUnderwriter(
  loanId: string,
  underwriterId: string | null
): Promise<Loan> {
  const response: AxiosResponse<Loan> = await apiClient.post(
    `/underwriting/${loanId}/assign`,
    { underwriter_id: underwriterId }
  );
  return response.data;
}

export async function createUnderwritingDecision(
  loanId: string,
  data: UnderwritingDecisionPayload
): Promise<UnderwritingDecision> {
  const response: AxiosResponse<UnderwritingDecision> = await apiClient.post(
    `/underwriting/${loanId}/decision`,
    data
  );
  return response.data;
}

export async function getUnderwritingDecisions(
  loanId: string
): Promise<UnderwritingDecision[]> {
  const response: AxiosResponse<UnderwritingDecision[]> = await apiClient.get(
    `/underwriting/${loanId}/decisions`
  );
  return response.data;
}

// ─── Closing: Closing Disclosures ────────────────────────────────────────────

export async function getClosingDisclosures(loanId: string): Promise<CDListItem[]> {
  const response: AxiosResponse<CDListItem[]> = await apiClient.get(
    `/loans/${loanId}/closing/disclosures`
  );
  return response.data;
}

export async function createClosingDisclosure(
  loanId: string,
  data: CDCreatePayload
): Promise<ClosingDisclosure> {
  const response: AxiosResponse<ClosingDisclosure> = await apiClient.post(
    `/loans/${loanId}/closing/disclosures`,
    data
  );
  return response.data;
}

export async function getClosingDisclosure(
  loanId: string,
  cdId: string
): Promise<ClosingDisclosure> {
  const response: AxiosResponse<ClosingDisclosure> = await apiClient.get(
    `/loans/${loanId}/closing/disclosures/${cdId}`
  );
  return response.data;
}

export async function updateClosingDisclosure(
  loanId: string,
  cdId: string,
  data: CDUpdatePayload
): Promise<ClosingDisclosure> {
  const response: AxiosResponse<ClosingDisclosure> = await apiClient.patch(
    `/loans/${loanId}/closing/disclosures/${cdId}`,
    data
  );
  return response.data;
}

export async function replaceCDFees(
  loanId: string,
  cdId: string,
  fees: CDFeeCreate[]
): Promise<ClosingDisclosure> {
  const response: AxiosResponse<ClosingDisclosure> = await apiClient.put(
    `/loans/${loanId}/closing/disclosures/${cdId}/fees`,
    fees
  );
  return response.data;
}

export async function issueClosingDisclosure(
  loanId: string,
  cdId: string,
  data: CDIssuePayload
): Promise<ClosingDisclosure> {
  const response: AxiosResponse<ClosingDisclosure> = await apiClient.post(
    `/loans/${loanId}/closing/disclosures/${cdId}/issue`,
    data
  );
  return response.data;
}

export async function getToleranceCheck(
  loanId: string,
  cdId: string
): Promise<ToleranceCheckResult> {
  const response: AxiosResponse<ToleranceCheckResult> = await apiClient.get(
    `/loans/${loanId}/closing/disclosures/${cdId}/tolerance-check`
  );
  return response.data;
}

// ─── Closing: Checklist ──────────────────────────────────────────────────────

export async function getClosingChecklist(loanId: string): Promise<ChecklistItem[]> {
  const response: AxiosResponse<ChecklistItem[]> = await apiClient.get(
    `/loans/${loanId}/closing/checklist`
  );
  return response.data;
}

export async function createChecklistItem(
  loanId: string,
  data: ChecklistItemCreatePayload
): Promise<ChecklistItem> {
  const response: AxiosResponse<ChecklistItem> = await apiClient.post(
    `/loans/${loanId}/closing/checklist`,
    data
  );
  return response.data;
}

export async function updateChecklistItem(
  loanId: string,
  itemId: string,
  data: ChecklistItemUpdatePayload
): Promise<ChecklistItem> {
  const response: AxiosResponse<ChecklistItem> = await apiClient.patch(
    `/loans/${loanId}/closing/checklist/${itemId}`,
    data
  );
  return response.data;
}

export async function deleteChecklistItem(
  loanId: string,
  itemId: string
): Promise<void> {
  await apiClient.delete(`/loans/${loanId}/closing/checklist/${itemId}`);
}

// ─── Closing: Wire Instructions ──────────────────────────────────────────────

export async function getWireInstructions(loanId: string): Promise<WireInstruction> {
  const response: AxiosResponse<WireInstruction> = await apiClient.get(
    `/loans/${loanId}/closing/wire-instructions`
  );
  return response.data;
}

export async function upsertWireInstructions(
  loanId: string,
  data: WireInstructionPayload
): Promise<WireInstruction> {
  const response: AxiosResponse<WireInstruction> = await apiClient.put(
    `/loans/${loanId}/closing/wire-instructions`,
    data
  );
  return response.data;
}

// ─── Closing: Funding Status ─────────────────────────────────────────────────

export async function getFundingStatus(loanId: string): Promise<FundingStatusData> {
  const response: AxiosResponse<FundingStatusData> = await apiClient.get(
    `/loans/${loanId}/closing/funding`
  );
  return response.data;
}

export async function upsertFundingStatus(
  loanId: string,
  data: FundingStatusPayload
): Promise<FundingStatusData> {
  const response: AxiosResponse<FundingStatusData> = await apiClient.put(
    `/loans/${loanId}/closing/funding`,
    data
  );
  return response.data;
}

// ─── Compliance ──────────────────────────────────────────────────────────────

import type {
  ComplianceDashboardStats,
  HMDARecord,
  HMDAValidationResult,
  AdverseActionNotice,
  AdverseActionCreatePayload,
  TRIDExceptionItem,
} from "@/types/compliance";

export async function getComplianceDashboard(): Promise<ComplianceDashboardStats> {
  const response: AxiosResponse<ComplianceDashboardStats> =
    await apiClient.get("/compliance/dashboard");
  return response.data;
}

export interface HMDAQueryParams {
  skip?: number;
  limit?: number;
  validation_status?: string;
  action_taken?: string;
  activity_year?: number;
  search?: string;
}

export async function getHMDARecords(
  params?: HMDAQueryParams
): Promise<PaginatedResponse<HMDARecord>> {
  const response: AxiosResponse<PaginatedResponse<HMDARecord>> =
    await apiClient.get("/compliance/hmda", { params });
  return response.data;
}

export async function syncHMDARecords(
  activityYear: number
): Promise<{ created: number; updated: number }> {
  const response = await apiClient.post("/compliance/hmda/sync", null, {
    params: { activity_year: activityYear },
  });
  return response.data;
}

export async function validateHMDARecord(
  loanId: string
): Promise<HMDAValidationResult> {
  const response: AxiosResponse<HMDAValidationResult> = await apiClient.post(
    `/compliance/hmda/${loanId}/validate`
  );
  return response.data;
}

export interface AdverseActionQueryParams {
  skip?: number;
  limit?: number;
  status?: string;
  overdue_only?: boolean;
  search?: string;
}

export async function getAdverseActions(
  params?: AdverseActionQueryParams
): Promise<PaginatedResponse<AdverseActionNotice>> {
  const response: AxiosResponse<PaginatedResponse<AdverseActionNotice>> =
    await apiClient.get("/compliance/adverse-actions", { params });
  return response.data;
}

export async function createAdverseAction(
  loanId: string,
  data: AdverseActionCreatePayload
): Promise<AdverseActionNotice> {
  const response: AxiosResponse<AdverseActionNotice> = await apiClient.post(
    `/compliance/${loanId}/adverse-action`,
    data
  );
  return response.data;
}

export async function updateAdverseAction(
  noticeId: string,
  data: Partial<{ status: string; sent_date: string; delivery_method: string; notes: string }>
): Promise<AdverseActionNotice> {
  const response: AxiosResponse<AdverseActionNotice> = await apiClient.patch(
    `/compliance/adverse-actions/${noticeId}`,
    data
  );
  return response.data;
}

export async function getTRIDExceptions(
  params?: { skip?: number; limit?: number }
): Promise<PaginatedResponse<TRIDExceptionItem>> {
  const response: AxiosResponse<PaginatedResponse<TRIDExceptionItem>> =
    await apiClient.get("/compliance/trid-exceptions", { params });
  return response.data;
}

export default apiClient;

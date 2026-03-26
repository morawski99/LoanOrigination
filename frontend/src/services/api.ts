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
} from "@/types/loan";
import type { UserResponse } from "@/types/user";
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

export default apiClient;

import { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getURLAProgress,
  getFullBorrower,
  updatePersonalInfo,
  createResidence,
  updateResidence,
  deleteResidence,
  createEmployment,
  updateEmployment,
  deleteEmployment,
  createOtherIncome,
  deleteOtherIncome,
  createAsset,
  updateAsset,
  deleteAsset,
  createLiability,
  updateLiability,
  deleteLiability,
  createREO,
  updateREO,
  deleteREO,
  upsertDeclarations,
  upsertMilitaryService,
  upsertDemographics,
} from "@/services/api";
import type {
  URLAProgress,
  FullBorrower,
  BorrowerPersonalInfo,
  ResidenceCreate,
  EmploymentCreate,
  OtherIncomeCreate,
  AssetCreate,
  LiabilityCreate,
  REOCreate,
  DeclarationUpsert,
  MilitaryServiceUpsert,
  DemographicsUpsert,
} from "@/types/urla";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseURLAFormOptions {
  loanId: string;
  borrowerId: string;
}

export interface UseURLAFormReturn {
  // Data
  borrower: FullBorrower | undefined;
  progress: URLAProgress | undefined;
  isLoading: boolean;
  isError: boolean;
  currentBorrowerId: string;

  // Auto-save state
  autoSaveStatus: AutoSaveStatus;
  lastSavedAt: Date | null;

  // Section navigation
  currentSection: number; // 1–9
  setCurrentSection: (section: number) => void;

  // Mutation functions — each returns Promise
  savePersonalInfo: (data: Partial<BorrowerPersonalInfo>) => Promise<void>;
  saveResidence: (data: ResidenceCreate) => Promise<void>;
  editResidence: (residenceId: string, data: Partial<ResidenceCreate>) => Promise<void>;
  removeResidence: (residenceId: string) => Promise<void>;
  saveEmployment: (data: EmploymentCreate) => Promise<void>;
  editEmployment: (employmentId: string, data: Partial<EmploymentCreate>) => Promise<void>;
  removeEmployment: (employmentId: string) => Promise<void>;
  saveOtherIncome: (data: OtherIncomeCreate) => Promise<void>;
  removeOtherIncome: (incomeId: string) => Promise<void>;
  saveAsset: (data: AssetCreate) => Promise<void>;
  editAsset: (assetId: string, data: Partial<AssetCreate>) => Promise<void>;
  removeAsset: (assetId: string) => Promise<void>;
  saveLiability: (data: LiabilityCreate) => Promise<void>;
  editLiability: (liabilityId: string, data: Partial<LiabilityCreate>) => Promise<void>;
  removeLiability: (liabilityId: string) => Promise<void>;
  saveREO: (data: REOCreate) => Promise<void>;
  editREO: (reoId: string, data: Partial<REOCreate>) => Promise<void>;
  removeREO: (reoId: string) => Promise<void>;
  saveDeclarations: (data: DeclarationUpsert) => Promise<void>;
  saveMilitaryService: (data: MilitaryServiceUpsert) => Promise<void>;
  saveDemographics: (data: DemographicsUpsert) => Promise<void>;

  // Debounced auto-save trigger
  triggerAutoSave: (saveFn: () => Promise<unknown>) => void;
}

export function useURLAForm({
  loanId,
  borrowerId,
}: UseURLAFormOptions): UseURLAFormReturn {
  const queryClient = useQueryClient();
  const [currentSection, setCurrentSection] = useState(1);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch progress
  const {
    data: progress,
    isLoading: progressLoading,
    isError: progressError,
  } = useQuery({
    queryKey: ["urla-progress", loanId],
    queryFn: () => getURLAProgress(loanId),
    enabled: Boolean(loanId),
  });

  // Fetch full borrower
  const {
    data: borrower,
    isLoading: borrowerLoading,
    isError: borrowerError,
  } = useQuery({
    queryKey: ["full-borrower", loanId, borrowerId],
    queryFn: () => getFullBorrower(loanId, borrowerId),
    enabled: Boolean(loanId) && Boolean(borrowerId),
  });

  const isLoading = progressLoading || borrowerLoading;
  const isError = progressError || borrowerError;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["full-borrower", loanId, borrowerId] });
    queryClient.invalidateQueries({ queryKey: ["urla-progress", loanId] });
  }, [queryClient, loanId, borrowerId]);

  // Generic mutation helper that tracks auto-save status
  const withAutoSave = useCallback(
    async (fn: () => Promise<unknown>): Promise<void> => {
      setAutoSaveStatus("saving");
      try {
        await fn();
        setAutoSaveStatus("saved");
        setLastSavedAt(new Date());
        invalidate();
        // Reset to idle after 3 seconds
        setTimeout(() => setAutoSaveStatus("idle"), 3000);
      } catch {
        setAutoSaveStatus("error");
        setTimeout(() => setAutoSaveStatus("idle"), 5000);
        throw new Error("Failed to save. Please try again.");
      }
    },
    [invalidate]
  );

  // Debounced auto-save: waits 1500ms before triggering
  const triggerAutoSave = useCallback(
    (saveFn: () => Promise<unknown>) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        void withAutoSave(saveFn);
      }, 1500);
    },
    [withAutoSave]
  );

  // Personal Info
  const savePersonalInfo = useCallback(
    (data: Partial<BorrowerPersonalInfo>) =>
      withAutoSave(() => updatePersonalInfo(loanId, borrowerId, data)),
    [loanId, borrowerId, withAutoSave]
  );

  // Residences
  const saveResidence = useCallback(
    (data: ResidenceCreate) =>
      withAutoSave(() => createResidence(loanId, borrowerId, data)),
    [loanId, borrowerId, withAutoSave]
  );
  const editResidence = useCallback(
    (residenceId: string, data: Partial<ResidenceCreate>) =>
      withAutoSave(() => updateResidence(loanId, borrowerId, residenceId, data)),
    [loanId, borrowerId, withAutoSave]
  );
  const removeResidence = useCallback(
    (residenceId: string) =>
      withAutoSave(() => deleteResidence(loanId, borrowerId, residenceId)),
    [loanId, borrowerId, withAutoSave]
  );

  // Employment
  const saveEmployment = useCallback(
    (data: EmploymentCreate) =>
      withAutoSave(() => createEmployment(loanId, borrowerId, data)),
    [loanId, borrowerId, withAutoSave]
  );
  const editEmployment = useCallback(
    (employmentId: string, data: Partial<EmploymentCreate>) =>
      withAutoSave(() => updateEmployment(loanId, borrowerId, employmentId, data)),
    [loanId, borrowerId, withAutoSave]
  );
  const removeEmployment = useCallback(
    (employmentId: string) =>
      withAutoSave(() => deleteEmployment(loanId, borrowerId, employmentId)),
    [loanId, borrowerId, withAutoSave]
  );

  // Other Income
  const saveOtherIncome = useCallback(
    (data: OtherIncomeCreate) =>
      withAutoSave(() => createOtherIncome(loanId, borrowerId, data)),
    [loanId, borrowerId, withAutoSave]
  );
  const removeOtherIncome = useCallback(
    (incomeId: string) =>
      withAutoSave(() => deleteOtherIncome(loanId, borrowerId, incomeId)),
    [loanId, borrowerId, withAutoSave]
  );

  // Assets
  const saveAsset = useCallback(
    (data: AssetCreate) =>
      withAutoSave(() => createAsset(loanId, borrowerId, data)),
    [loanId, borrowerId, withAutoSave]
  );
  const editAsset = useCallback(
    (assetId: string, data: Partial<AssetCreate>) =>
      withAutoSave(() => updateAsset(loanId, borrowerId, assetId, data)),
    [loanId, borrowerId, withAutoSave]
  );
  const removeAsset = useCallback(
    (assetId: string) =>
      withAutoSave(() => deleteAsset(loanId, borrowerId, assetId)),
    [loanId, borrowerId, withAutoSave]
  );

  // Liabilities
  const saveLiability = useCallback(
    (data: LiabilityCreate) =>
      withAutoSave(() => createLiability(loanId, borrowerId, data)),
    [loanId, borrowerId, withAutoSave]
  );
  const editLiability = useCallback(
    (liabilityId: string, data: Partial<LiabilityCreate>) =>
      withAutoSave(() => updateLiability(loanId, borrowerId, liabilityId, data)),
    [loanId, borrowerId, withAutoSave]
  );
  const removeLiability = useCallback(
    (liabilityId: string) =>
      withAutoSave(() => deleteLiability(loanId, borrowerId, liabilityId)),
    [loanId, borrowerId, withAutoSave]
  );

  // REO
  const saveREO = useCallback(
    (data: REOCreate) => withAutoSave(() => createREO(loanId, borrowerId, data)),
    [loanId, borrowerId, withAutoSave]
  );
  const editREO = useCallback(
    (reoId: string, data: Partial<REOCreate>) =>
      withAutoSave(() => updateREO(loanId, borrowerId, reoId, data)),
    [loanId, borrowerId, withAutoSave]
  );
  const removeREO = useCallback(
    (reoId: string) =>
      withAutoSave(() => deleteREO(loanId, borrowerId, reoId)),
    [loanId, borrowerId, withAutoSave]
  );

  // Upserts
  const saveDeclarations = useCallback(
    (data: DeclarationUpsert) =>
      withAutoSave(() => upsertDeclarations(loanId, borrowerId, data)),
    [loanId, borrowerId, withAutoSave]
  );
  const saveMilitaryService = useCallback(
    (data: MilitaryServiceUpsert) =>
      withAutoSave(() => upsertMilitaryService(loanId, borrowerId, data)),
    [loanId, borrowerId, withAutoSave]
  );
  const saveDemographics = useCallback(
    (data: DemographicsUpsert) =>
      withAutoSave(() => upsertDemographics(loanId, borrowerId, data)),
    [loanId, borrowerId, withAutoSave]
  );

  return {
    borrower,
    progress,
    isLoading,
    isError,
    currentBorrowerId: borrowerId,
    autoSaveStatus,
    lastSavedAt,
    currentSection,
    setCurrentSection,
    savePersonalInfo,
    saveResidence,
    editResidence,
    removeResidence,
    saveEmployment,
    editEmployment,
    removeEmployment,
    saveOtherIncome,
    removeOtherIncome,
    saveAsset,
    editAsset,
    removeAsset,
    saveLiability,
    editLiability,
    removeLiability,
    saveREO,
    editREO,
    removeREO,
    saveDeclarations,
    saveMilitaryService,
    saveDemographics,
    triggerAutoSave,
  };
}

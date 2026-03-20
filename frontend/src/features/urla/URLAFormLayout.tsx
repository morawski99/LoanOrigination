import React from "react";
import { useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import {
  CheckCircle,
  Circle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Save,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/design-system/components";
import { URLASectionStatus } from "@/types/urla";
import type { URLAProgress, FullBorrower } from "@/types/urla";
import type { AutoSaveStatus } from "./hooks/useURLAForm";

interface SectionDef {
  number: number;
  label: string;
  progressKey: keyof URLAProgress;
}

const SECTIONS: SectionDef[] = [
  { number: 1, label: "Borrower Information", progressKey: "personal_info" },
  { number: 2, label: "Employment & Income", progressKey: "employment" },
  { number: 3, label: "Assets & Liabilities", progressKey: "assets_liabilities" },
  { number: 4, label: "Loan & Property", progressKey: "loan_property" },
  { number: 5, label: "Declarations", progressKey: "declarations" },
  { number: 6, label: "Acknowledgments", progressKey: "acknowledgments" },
  { number: 7, label: "Military Service", progressKey: "military_service" },
  { number: 8, label: "Demographic Info", progressKey: "demographics" },
  { number: 9, label: "Loan Originator", progressKey: "loan_property" },
];

interface URLAFormLayoutProps {
  loanId: string;
  loanNumber: string;
  borrower: FullBorrower | undefined;
  progress: URLAProgress | undefined;
  currentSection: number;
  onSectionChange: (section: number) => void;
  autoSaveStatus: AutoSaveStatus;
  lastSavedAt: Date | null;
  children: React.ReactNode;
  coBorrowerIds?: Array<{ id: string; name: string }>;
  activeBorrowerId?: string;
  onBorrowerSwitch?: (borrowerId: string) => void;
}

function AutoSaveIndicator({
  status,
  lastSavedAt,
}: {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
}) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-neutral-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
        Saving...
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-success">
        <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
        Saved
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-error" role="alert">
        <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
        Error saving
      </span>
    );
  }
  if (lastSavedAt) {
    const mins = Math.floor((Date.now() - lastSavedAt.getTime()) / 60000);
    return (
      <span className="flex items-center gap-1.5 text-xs text-neutral-400">
        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
        {mins === 0 ? "Saved just now" : `Saved ${mins} min ago`}
      </span>
    );
  }
  return null;
}

function SectionStatusIcon({ status }: { status: URLASectionStatus }) {
  switch (status) {
    case URLASectionStatus.COMPLETED:
      return (
        <CheckCircle
          className="w-4 h-4 text-success shrink-0"
          aria-label="Complete"
        />
      );
    case URLASectionStatus.IN_PROGRESS:
      return (
        <Circle
          className="w-4 h-4 text-primary-500 shrink-0"
          aria-label="In progress"
        />
      );
    default:
      return (
        <Circle
          className="w-4 h-4 text-neutral-300 shrink-0"
          aria-label="Not started"
        />
      );
  }
}

export const URLAFormLayout: React.FC<URLAFormLayoutProps> = ({
  loanId,
  loanNumber,
  borrower,
  progress,
  currentSection,
  onSectionChange,
  autoSaveStatus,
  lastSavedAt,
  children,
  coBorrowerIds = [],
  activeBorrowerId,
  onBorrowerSwitch,
}) => {
  const navigate = useNavigate();
  const borrowerName = borrower
    ? `${borrower.first_name} ${borrower.last_name}`
    : "Loading...";

  const totalSections = SECTIONS.length;
  const canGoBack = currentSection > 1;
  const canGoNext = currentSection < totalSections;
  const allComplete = progress
    ? Object.values(progress).every((s) => s === URLASectionStatus.COMPLETED)
    : false;

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      {/* Top Bar */}
      <header className="bg-primary-800 text-white px-4 md:px-6 py-3 flex items-center justify-between gap-4 shadow-md shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            aria-label="Back to loan file"
            onClick={() => navigate(`/loans/${loanId}`)}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Loan File</span>
          </button>
          <span className="text-white/40 hidden sm:inline" aria-hidden="true">|</span>
          <div className="min-w-0">
            <p className="text-xs text-white/60 truncate">Loan Application</p>
            <p className="font-semibold text-sm truncate">{borrowerName}</p>
          </div>
          <span className="font-mono text-primary-300 text-xs hidden md:inline">
            {loanNumber}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <AutoSaveIndicator status={autoSaveStatus} lastSavedAt={lastSavedAt} />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/loans/${loanId}`)}
            className="border-white/30 text-white hover:bg-white/10 focus:ring-white/50"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline ml-1">Save &amp; Exit</span>
          </Button>
        </div>
      </header>

      {/* Co-borrower tab switcher */}
      {coBorrowerIds.length > 0 && onBorrowerSwitch && (
        <div className="bg-white border-b border-neutral-200 px-4 md:px-6 py-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onBorrowerSwitch(activeBorrowerId ?? "")}
            className={clsx(
              "px-4 py-1.5 rounded text-sm font-medium transition-colors",
              activeBorrowerId === borrower?.id
                ? "bg-primary-600 text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            )}
          >
            Primary Borrower
          </button>
          {coBorrowerIds.map((cb) => (
            <button
              key={cb.id}
              type="button"
              onClick={() => onBorrowerSwitch(cb.id)}
              className={clsx(
                "px-4 py-1.5 rounded text-sm font-medium transition-colors",
                activeBorrowerId === cb.id
                  ? "bg-primary-600 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              )}
            >
              {cb.name}
            </button>
          ))}
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop only */}
        <aside
          className="hidden md:flex w-60 bg-white border-r border-neutral-200 flex-col shrink-0 overflow-y-auto"
          aria-label="URLA sections"
        >
          <div className="p-4 border-b border-neutral-100">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Application Sections
            </p>
          </div>
          <nav className="p-2 flex-1">
            <ul className="space-y-0.5" role="list">
              {SECTIONS.map((section) => {
                const sectionStatus =
                  progress?.[section.progressKey] ?? URLASectionStatus.NOT_STARTED;
                const isActive = currentSection === section.number;

                return (
                  <li key={section.number}>
                    <button
                      type="button"
                      onClick={() => onSectionChange(section.number)}
                      aria-current={isActive ? "page" : undefined}
                      className={clsx(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-sm font-medium text-left transition-colors",
                        isActive
                          ? "bg-primary-100 text-primary-800"
                          : "text-neutral-700 hover:bg-neutral-100"
                      )}
                    >
                      <SectionStatusIcon status={sectionStatus} />
                      <span className="flex-1 leading-snug">{section.label}</span>
                      {isActive && (
                        <ChevronRight
                          className="w-3.5 h-3.5 text-primary-600 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {allComplete && (
            <div className="p-4 border-t border-neutral-100">
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => navigate(`/loans/${loanId}/urla/review`)}
              >
                Review &amp; Submit
              </Button>
            </div>
          )}
        </aside>

        {/* Form area */}
        <main
          className="flex-1 overflow-y-auto flex flex-col"
          id="main-content"
        >
          {/* Section content */}
          <div className="flex-1 p-4 md:p-8 max-w-3xl w-full mx-auto">
            {children}
          </div>

          {/* Bottom navigation bar */}
          <div className="sticky bottom-0 bg-white border-t border-neutral-200 px-4 md:px-8 py-4 flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={!canGoBack}
              onClick={() => canGoBack && onSectionChange(currentSection - 1)}
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              Previous
            </Button>

            <span className="text-sm text-neutral-500 hidden sm:block">
              Section {currentSection} of {totalSections}
            </span>

            {canGoNext ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => onSectionChange(currentSection + 1)}
              >
                Next Section
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Button>
            ) : allComplete ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => navigate(`/loans/${loanId}/urla/review`)}
              >
                Review &amp; Submit
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => navigate(`/loans/${loanId}`)}
              >
                Save &amp; Exit
              </Button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default URLAFormLayout;

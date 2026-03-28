import { Suspense, lazy, useEffect } from "react";
import {
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLoan } from "@/services/api";
import { useURLAForm } from "./hooks/useURLAForm";
import { URLAFormLayout } from "./URLAFormLayout";

// Lazy-load each section to keep the initial bundle small
const Section1PersonalInfo = lazy(
  () => import("./sections/Section1PersonalInfo")
);
const Section2Employment = lazy(
  () => import("./sections/Section2Employment")
);
const Section3Assets = lazy(() => import("./sections/Section3Assets"));
const Section4LoanProperty = lazy(
  () => import("./sections/Section4LoanProperty")
);
const Section5Declarations = lazy(
  () => import("./sections/Section5Declarations")
);
const Section6Acknowledgments = lazy(
  () => import("./sections/Section6Acknowledgments")
);
const Section7Military = lazy(() => import("./sections/Section7Military"));
const Section8Demographics = lazy(
  () => import("./sections/Section8Demographics")
);
const Section9LoanOriginator = lazy(
  () => import("./sections/Section9LoanOriginator")
);

function SectionFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div
        className="w-7 h-7 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"
        role="status"
        aria-label="Loading section"
      />
    </div>
  );
}

/**
 * URLAPage
 *
 * Route: /loans/:loanId/urla
 * Optional query params:
 *   ?section=1-9   — jump to a specific section
 *   ?borrowerId=…  — override which borrower to edit (defaults to primary)
 */
export default function URLAPage() {
  const { loanId } = useParams<{ loanId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Resolve section from URL query param; default to 1
  const sectionParam = Number(searchParams.get("section") ?? "1");
  const initialSection =
    sectionParam >= 1 && sectionParam <= 9 ? sectionParam : 1;

  // Resolve borrowerId: first try query param, then fall back to primary borrower
  const borrowerIdParam = searchParams.get("borrowerId") ?? "";

  // Fetch loan to get primary borrower id when borrowerIdParam is not set
  const { data: loan, isLoading: loanLoading } = useQuery({
    queryKey: ["loan", loanId],
    queryFn: () => getLoan(loanId!),
    enabled: Boolean(loanId),
  });

  // Determine the active borrower id
  const primaryBorrower = loan?.borrowers.find(
    (b) => b.borrower_classification === "Primary"
  );
  const activeBorrowerId =
    borrowerIdParam ||
    primaryBorrower?.id ||
    (loan?.borrowers[0]?.id ?? "");

  // Co-borrowers for the tab switcher
  const coBorrowers =
    loan?.borrowers
      .filter((b) => b.id !== activeBorrowerId)
      .map((b) => ({ id: b.id, name: `${b.first_name} ${b.last_name}` })) ??
    [];

  const formHook = useURLAForm({
    loanId: loanId!,
    borrowerId: activeBorrowerId,
  });

  const { currentSection, setCurrentSection, borrower, progress, autoSaveStatus, lastSavedAt } =
    formHook;

  // Keep section state in sync with URL param
  useEffect(() => {
    if (initialSection !== currentSection) {
      setCurrentSection(initialSection);
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When section changes (via sidebar / prev/next), update URL
  const handleSectionChange = (section: number) => {
    setCurrentSection(section);
    setSearchParams(
      (prev) => {
        prev.set("section", String(section));
        return prev;
      },
      { replace: true }
    );
    // Scroll to top of main content when changing sections
    document.getElementById("main-content")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  // When borrower tab switches, update URL
  const handleBorrowerSwitch = (newBorrowerId: string) => {
    setSearchParams(
      (prev) => {
        prev.set("borrowerId", newBorrowerId);
        return prev;
      },
      { replace: true }
    );
  };

  if (loanLoading || !loanId) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"
            role="status"
            aria-label="Loading application"
          />
          <p className="text-sm text-neutral-600">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!activeBorrowerId) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-8 max-w-sm w-full text-center shadow-sm">
          <p className="text-error font-semibold mb-2">No Borrower Found</p>
          <p className="text-sm text-neutral-600 mb-4">
            This loan does not have any borrowers. Please add a borrower before
            completing the application.
          </p>
          <button
            type="button"
            onClick={() => navigate(`/loans/${loanId}`)}
            className="text-primary-600 text-sm hover:underline focus:outline-none focus:underline"
          >
            Return to Loan File
          </button>
        </div>
      </div>
    );
  }

  return (
    <URLAFormLayout
      loanId={loanId}
      loanNumber={loan?.loan_number ?? ""}
      borrower={borrower}
      progress={progress}
      currentSection={currentSection}
      onSectionChange={handleSectionChange}
      autoSaveStatus={autoSaveStatus}
      lastSavedAt={lastSavedAt}
      coBorrowerIds={coBorrowers}
      activeBorrowerId={activeBorrowerId}
      onBorrowerSwitch={handleBorrowerSwitch}
    >
      <Suspense fallback={<SectionFallback />}>
        {currentSection === 1 && (
          <Section1PersonalInfo
            borrower={borrower}
            formHook={formHook}
          />
        )}
        {currentSection === 2 && (
          <Section2Employment
            borrower={borrower}
            formHook={formHook}
          />
        )}
        {currentSection === 3 && (
          <Section3Assets
            borrower={borrower}
            formHook={formHook}
          />
        )}
        {currentSection === 4 && (
          <Section4LoanProperty
            loanId={loanId}
            formHook={formHook}
          />
        )}
        {currentSection === 5 && (
          <Section5Declarations
            borrower={borrower}
            formHook={formHook}
          />
        )}
        {currentSection === 6 && (
          <Section6Acknowledgments
            borrower={borrower}
            formHook={formHook}
          />
        )}
        {currentSection === 7 && (
          <Section7Military
            borrower={borrower}
            formHook={formHook}
          />
        )}
        {currentSection === 8 && (
          <Section8Demographics
            borrower={borrower}
            formHook={formHook}
          />
        )}
        {currentSection === 9 && (
          <Section9LoanOriginator loanId={loanId} />
        )}
      </Suspense>
    </URLAFormLayout>
  );
}

import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Circle,
  AlertTriangle,
  Edit2,
  Send,
  X,
  FileText,
} from "lucide-react";
import { Button } from "@/design-system/components";
import { getLoan, getURLAProgress, getFullBorrower, updateLoan } from "@/services/api";
import { URLASectionStatus } from "@/types/urla";
import type { URLAProgress, FullBorrower } from "@/types/urla";
import { LoanStatus } from "@/types/loan";

// ─── Section summary renderers ────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-0.5 py-1.5 border-b border-neutral-100 last:border-0">
      <dt className="text-xs text-neutral-500 shrink-0 sm:w-48">{label}</dt>
      <dd className="text-sm text-neutral-900 font-medium">{value || "—"}</dd>
    </div>
  );
}

function BooleanRow({ label, value }: { label: string; value: boolean | null | undefined }) {
  if (value === null || value === undefined) {
    return <ReviewRow label={label} value={undefined} />;
  }
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-0.5 py-1.5 border-b border-neutral-100 last:border-0">
      <dt className="text-xs text-neutral-500 shrink-0 sm:w-48">{label}</dt>
      <dd
        className={clsx(
          "text-sm font-semibold",
          value ? "text-success" : "text-neutral-700"
        )}
      >
        {value ? "Yes" : "No"}
      </dd>
    </div>
  );
}

function Section1Summary({ borrower }: { borrower: FullBorrower }) {
  return (
    <dl className="space-y-0">
      <ReviewRow label="Full Name" value={`${borrower.first_name} ${borrower.middle_name ? borrower.middle_name + " " : ""}${borrower.last_name}${borrower.suffix_name ? " " + borrower.suffix_name : ""}`} />
      <ReviewRow label="Email" value={borrower.email} />
      <ReviewRow label="Mobile Phone" value={borrower.phone} />
      <ReviewRow label="Citizenship" value={borrower.citizenship_residency_type?.replace(/([A-Z])/g, " $1").trim()} />
      <ReviewRow label="Marital Status" value={borrower.marital_status_type} />
      <ReviewRow label="Dependents" value={String(borrower.number_of_dependents ?? 0)} />
      {borrower.residences.length > 0 && (
        <ReviewRow
          label="Current Address"
          value={`${borrower.residences[0].address_line}, ${borrower.residences[0].city}, ${borrower.residences[0].state} ${borrower.residences[0].zip}`}
        />
      )}
    </dl>
  );
}

function Section2Summary({ borrower }: { borrower: FullBorrower }) {
  const currentEmployment = borrower.employments.find((e) => e.is_current && e.is_primary);
  const totalIncome = borrower.employments.reduce((sum, e) => {
    return (
      sum +
      (e.base_income_amount ?? 0) +
      (e.overtime_income_amount ?? 0) +
      (e.bonus_income_amount ?? 0) +
      (e.commission_income_amount ?? 0)
    );
  }, 0) + borrower.other_incomes.reduce((sum, o) => sum + o.monthly_income_amount, 0);

  return (
    <dl className="space-y-0">
      <ReviewRow
        label="Employment Status"
        value={currentEmployment?.employment_status_type?.replace(/([A-Z])/g, " $1").trim() ?? "Not provided"}
      />
      <ReviewRow label="Employer" value={currentEmployment?.employer_name} />
      <ReviewRow label="Position" value={currentEmployment?.position_description} />
      <ReviewRow
        label="Monthly Base Income"
        value={
          currentEmployment?.base_income_amount != null
            ? `$${Number(currentEmployment.base_income_amount).toLocaleString()}`
            : "—"
        }
      />
      <ReviewRow
        label="Total Monthly Income"
        value={totalIncome > 0 ? `$${totalIncome.toLocaleString()}` : "—"}
      />
      <ReviewRow
        label="Other Income Sources"
        value={borrower.other_incomes.length > 0 ? String(borrower.other_incomes.length) : "None"}
      />
    </dl>
  );
}

function Section3Summary({ borrower }: { borrower: FullBorrower }) {
  const totalAssets = borrower.assets.reduce(
    (sum, a) => sum + a.current_value_amount,
    0
  );
  const totalMonthlyPayments = borrower.liabilities.reduce(
    (sum, l) => sum + (l.monthly_payment_amount ?? 0),
    0
  );
  return (
    <dl className="space-y-0">
      <ReviewRow label="Total Assets" value={totalAssets > 0 ? `$${totalAssets.toLocaleString()}` : "—"} />
      <ReviewRow label="Asset Accounts" value={String(borrower.assets.length)} />
      <ReviewRow label="Liabilities" value={String(borrower.liabilities.length)} />
      <ReviewRow
        label="Total Monthly Payments"
        value={totalMonthlyPayments > 0 ? `$${totalMonthlyPayments.toLocaleString()}` : "—"}
      />
      <ReviewRow label="REO Properties" value={String(borrower.reo_properties.length)} />
    </dl>
  );
}

function Section5Summary({ borrower }: { borrower: FullBorrower }) {
  const d = borrower.declaration;
  if (!d) return <p className="text-sm text-neutral-500">Not completed</p>;
  return (
    <dl className="space-y-0">
      <ReviewRow
        label="Occupancy Intent"
        value={d.occupancy_intent_type?.replace(/([A-Z])/g, " $1").trim()}
      />
      <BooleanRow label="Outstanding Judgment" value={d.outstanding_judgment_indicator} />
      <BooleanRow label="Declared Bankruptcy" value={d.declared_bankruptcy_indicator} />
      <BooleanRow label="Foreclosure (7 yrs)" value={d.foreclosure_indicator} />
      <BooleanRow label="Party to Lawsuit" value={d.party_to_lawsuit_indicator} />
      <BooleanRow label="Federal Debt Delinquency" value={d.federal_debt_delinquency_indicator} />
      <BooleanRow label="U.S. Citizen" value={d.us_citizen_indicator} />
    </dl>
  );
}

function Section7Summary({ borrower }: { borrower: FullBorrower }) {
  const ms = borrower.military_service;
  if (!ms) return <p className="text-sm text-neutral-500">Not completed</p>;
  return (
    <dl className="space-y-0">
      <BooleanRow label="Served in Armed Forces" value={ms.did_serve_indicator} />
      {ms.did_serve_indicator && (
        <>
          <ReviewRow label="Branch of Service" value={ms.branch_of_service_type} />
          <BooleanRow label="Active Duty" value={ms.active_duty_indicator} />
          <BooleanRow label="SCRA Coverage" value={ms.scra_indicator} />
        </>
      )}
    </dl>
  );
}

function Section8Summary({ borrower }: { borrower: FullBorrower }) {
  const d = borrower.demographics;
  if (!d) return <p className="text-sm text-neutral-500">Not completed</p>;
  const ethnicities: string[] = [];
  if (d.ethnicity_hispanic_latino_indicator) ethnicities.push("Hispanic or Latino");
  if (d.ethnicity_not_hispanic_indicator) ethnicities.push("Not Hispanic or Latino");
  if (d.ethnicity_not_provided_indicator) ethnicities.push("Prefer not to disclose");

  const races: string[] = [];
  if (d.race_american_indian_indicator) races.push("American Indian");
  if (d.race_asian_indicator) races.push("Asian");
  if (d.race_black_african_american_indicator) races.push("Black or African American");
  if (d.race_native_hawaiian_indicator) races.push("Native Hawaiian / Pacific Islander");
  if (d.race_white_indicator) races.push("White");
  if (d.race_not_provided_indicator) races.push("Prefer not to disclose");

  const sexes: string[] = [];
  if (d.sex_female_indicator) sexes.push("Female");
  if (d.sex_male_indicator) sexes.push("Male");
  if (d.sex_not_provided_indicator) sexes.push("Prefer not to disclose");

  return (
    <dl className="space-y-0">
      <ReviewRow label="Ethnicity" value={ethnicities.join(", ") || "—"} />
      <ReviewRow label="Race" value={races.join(", ") || "—"} />
      <ReviewRow label="Sex" value={sexes.join(", ") || "—"} />
    </dl>
  );
}

// ─── Section accordion ────────────────────────────────────────────────────────

interface ReviewSectionProps {
  sectionNumber: number;
  title: string;
  status: URLASectionStatus;
  loanId: string;
  children: React.ReactNode;
}

function ReviewSection({
  sectionNumber,
  title,
  status,
  loanId,
  children,
}: ReviewSectionProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const isComplete = status === URLASectionStatus.COMPLETED;

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-3 flex-1 text-left focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-inset rounded"
          aria-expanded={expanded}
          aria-controls={`review-section-${sectionNumber}`}
        >
          {isComplete ? (
            <CheckCircle
              className="w-5 h-5 text-success shrink-0"
              aria-label="Complete"
            />
          ) : (
            <Circle
              className="w-5 h-5 text-warning shrink-0"
              aria-label="Incomplete"
            />
          )}
          <div>
            <p className="text-xs text-neutral-500 font-medium">
              Section {sectionNumber}
            </p>
            <p className="text-sm font-semibold text-neutral-900 leading-snug">
              {title}
            </p>
          </div>
          {expanded ? (
            <ChevronUp
              className="w-4 h-4 text-neutral-400 ml-auto"
              aria-hidden="true"
            />
          ) : (
            <ChevronDown
              className="w-4 h-4 text-neutral-400 ml-auto"
              aria-hidden="true"
            />
          )}
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="ml-4 shrink-0"
          onClick={() =>
            navigate(`/loans/${loanId}/urla?section=${sectionNumber}`)
          }
          aria-label={`Edit section ${sectionNumber}: ${title}`}
        >
          <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="ml-1 hidden sm:inline">Edit</span>
        </Button>
      </div>

      {/* Content */}
      {expanded && (
        <div
          id={`review-section-${sectionNumber}`}
          className="border-t border-neutral-100 px-5 py-4"
        >
          {!isComplete && (
            <div
              className="flex items-center gap-2 p-3 mb-4 bg-warning/10 border border-warning/30 rounded-lg"
              role="alert"
            >
              <AlertTriangle
                className="w-4 h-4 text-warning shrink-0"
                aria-hidden="true"
              />
              <p className="text-sm text-neutral-700">
                This section is incomplete. Please edit it before submitting.
              </p>
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Confirmation Modal ────────────────────────────────────────────────────────

function SubmitModal({
  onConfirm,
  onCancel,
  isSubmitting,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <Send
                className="w-5 h-5 text-primary-600"
                aria-hidden="true"
              />
            </div>
            <h2
              id="submit-modal-title"
              className="text-lg font-bold text-neutral-900"
            >
              Submit Application?
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onCancel}
            className="text-neutral-400 hover:text-neutral-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 rounded"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <p className="text-sm text-neutral-700 mb-2">
          You are about to submit this loan application. Once submitted:
        </p>
        <ul className="text-sm text-neutral-600 list-disc list-inside mb-6 space-y-1">
          <li>The application status will change to <strong>In Process</strong></li>
          <li>Today's date will be recorded as the application received date</li>
          <li>You can still make changes by returning to edit mode</li>
        </ul>

        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            size="md"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onConfirm}
            isLoading={isSubmitting}
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            Submit Application
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Success State ────────────────────────────────────────────────────────────

function SubmitSuccess({ loanNumber, loanId }: { loanNumber: string; loanId: string }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5">
          <CheckCircle
            className="w-8 h-8 text-success"
            aria-hidden="true"
          />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          Application Submitted
        </h1>
        <p className="text-neutral-600 text-sm mb-1">
          Your loan application has been successfully submitted.
        </p>
        <p className="font-mono font-semibold text-primary-700 text-sm mb-6">
          Loan Number: {loanNumber}
        </p>
        <p className="text-xs text-neutral-500 mb-8">
          A loan officer will review your application shortly. You will be
          contacted if additional information is required.
        </p>
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={() => navigate(`/loans/${loanId}`)}
          >
            View Loan File
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            onClick={() => navigate("/pipeline")}
          >
            Return to Pipeline
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function URLAReviewPage() {
  const { loanId } = useParams<{ loanId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: loan, isLoading: loanLoading } = useQuery({
    queryKey: ["loan", loanId],
    queryFn: () => getLoan(loanId!),
    enabled: Boolean(loanId),
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["urla-progress", loanId],
    queryFn: () => getURLAProgress(loanId!),
    enabled: Boolean(loanId),
  });

  const primaryBorrower = loan?.borrowers.find(
    (b) => b.borrower_classification === "Primary"
  );

  const { data: borrower, isLoading: borrowerLoading } = useQuery({
    queryKey: ["full-borrower", loanId, primaryBorrower?.id],
    queryFn: () => getFullBorrower(loanId!, primaryBorrower!.id),
    enabled: Boolean(loanId) && Boolean(primaryBorrower?.id),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      updateLoan(loanId!, {
        status: LoanStatus.IN_PROCESS,
        application_received_date: new Date().toISOString().split("T")[0],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
      setSubmitted(true);
      setShowModal(false);
    },
  });

  const isLoading = loanLoading || progressLoading || borrowerLoading;

  // Check if all sections are complete (excluding Section 9 which is read-only)
  const allSectionsComplete = progress
    ? [
        progress.personal_info,
        progress.employment,
        progress.assets_liabilities,
        progress.declarations,
        progress.military_service,
        progress.demographics,
      ].every((s) => s === URLASectionStatus.COMPLETED)
    : false;

  if (submitted && loan) {
    return <SubmitSuccess loanNumber={loan.loan_number} loanId={loanId!} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"
            role="status"
            aria-label="Loading review"
          />
          <p className="text-sm text-neutral-600">Loading review...</p>
        </div>
      </div>
    );
  }

  if (!loan || !borrower) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-8 max-w-sm w-full text-center">
          <p className="text-error font-semibold mb-2">Unable to Load Review</p>
          <p className="text-sm text-neutral-600 mb-4">
            The application data could not be loaded.
          </p>
          <Link
            to={`/loans/${loanId}`}
            className="text-primary-600 text-sm hover:underline"
          >
            Return to Loan File
          </Link>
        </div>
      </div>
    );
  }

  const getStatus = (key: keyof URLAProgress): URLASectionStatus =>
    progress?.[key] ?? URLASectionStatus.NOT_STARTED;

  const borrowerName = `${borrower.first_name} ${borrower.last_name}`;

  return (
    <>
      <div className="min-h-screen bg-neutral-100 flex flex-col">
        {/* Top Bar */}
        <header className="bg-primary-800 text-white px-4 md:px-6 py-3 flex items-center justify-between gap-4 shadow-md shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(`/loans/${loanId}/urla?section=9`)}
              aria-label="Back to application"
              className="flex items-center gap-1 text-white/80 hover:text-white text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Application</span>
            </button>
            <span className="text-white/40 hidden sm:inline" aria-hidden="true">|</span>
            <div className="min-w-0">
              <p className="text-xs text-white/60">Review &amp; Submit</p>
              <p className="font-semibold text-sm truncate">{borrowerName}</p>
            </div>
            <span className="font-mono text-primary-300 text-xs hidden md:inline">
              {loan.loan_number}
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto py-8 px-4 md:px-8" id="main-content">
          <div className="max-w-3xl mx-auto">
            {/* Page heading */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <FileText
                  className="w-6 h-6 text-primary-600"
                  aria-hidden="true"
                />
                <h1 className="text-2xl font-bold text-neutral-900">
                  Review Your Application
                </h1>
              </div>
              <p className="text-sm text-neutral-600">
                Please review all sections below. Click{" "}
                <strong>Edit</strong> on any section to make changes. When
                everything looks correct, submit your application.
              </p>
            </div>

            {/* Incomplete warning */}
            {!allSectionsComplete && (
              <div
                className="flex items-start gap-3 p-4 mb-6 bg-warning/10 border border-warning/30 rounded-xl"
                role="alert"
              >
                <AlertTriangle
                  className="w-5 h-5 text-warning shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-neutral-800 mb-0.5">
                    Some sections are incomplete
                  </p>
                  <p className="text-sm text-neutral-600">
                    You can still submit, but incomplete sections may delay
                    processing. We recommend completing all sections first.
                  </p>
                </div>
              </div>
            )}

            {/* Section accordions */}
            <div className="space-y-4">
              <ReviewSection
                sectionNumber={1}
                title="Borrower Information"
                status={getStatus("personal_info")}
                loanId={loanId!}
              >
                <Section1Summary borrower={borrower} />
              </ReviewSection>

              <ReviewSection
                sectionNumber={2}
                title="Employment & Income"
                status={getStatus("employment")}
                loanId={loanId!}
              >
                <Section2Summary borrower={borrower} />
              </ReviewSection>

              <ReviewSection
                sectionNumber={3}
                title="Assets & Liabilities"
                status={getStatus("assets_liabilities")}
                loanId={loanId!}
              >
                <Section3Summary borrower={borrower} />
              </ReviewSection>

              <ReviewSection
                sectionNumber={4}
                title="Loan & Property Information"
                status={getStatus("loan_property")}
                loanId={loanId!}
              >
                <dl className="space-y-0">
                  <ReviewRow label="Loan Number" value={loan.loan_number} />
                  <ReviewRow
                    label="Loan Amount"
                    value={`$${Number(loan.loan_amount).toLocaleString()}`}
                  />
                  <ReviewRow label="Loan Purpose" value={loan.loan_purpose_type} />
                  <ReviewRow label="Loan Type" value={loan.loan_type} />
                  <ReviewRow label="Property Address" value={`${loan.property_address_line}, ${loan.property_city}, ${loan.property_state} ${loan.property_zip}`} />
                </dl>
              </ReviewSection>

              <ReviewSection
                sectionNumber={5}
                title="Declarations"
                status={getStatus("declarations")}
                loanId={loanId!}
              >
                <Section5Summary borrower={borrower} />
              </ReviewSection>

              <ReviewSection
                sectionNumber={6}
                title="Acknowledgments"
                status={getStatus("acknowledgments")}
                loanId={loanId!}
              >
                <p className="text-sm text-neutral-700">
                  Borrower certification and electronic signature.
                </p>
              </ReviewSection>

              <ReviewSection
                sectionNumber={7}
                title="Military Service"
                status={getStatus("military_service")}
                loanId={loanId!}
              >
                <Section7Summary borrower={borrower} />
              </ReviewSection>

              <ReviewSection
                sectionNumber={8}
                title="Demographic Information"
                status={getStatus("demographics")}
                loanId={loanId!}
              >
                <Section8Summary borrower={borrower} />
              </ReviewSection>

              <ReviewSection
                sectionNumber={9}
                title="Loan Originator Information"
                status={URLASectionStatus.COMPLETED}
                loanId={loanId!}
              >
                <p className="text-sm text-neutral-700">
                  Populated from your loan originator profile.
                </p>
              </ReviewSection>
            </div>

            {/* Submit CTA */}
            <div className="mt-8 bg-white border border-neutral-200 rounded-xl p-6">
              <h2 className="text-base font-bold text-neutral-900 mb-1">
                Ready to Submit?
              </h2>
              <p className="text-sm text-neutral-600 mb-4">
                By submitting, you confirm the information above is accurate
                and authorize the lender to process your application.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="primary"
                  size="md"
                  className="sm:flex-1"
                  onClick={() => setShowModal(true)}
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  Submit Application
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => navigate(`/loans/${loanId}/urla?section=1`)}
                >
                  Continue Editing
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Confirmation modal */}
      {showModal && (
        <SubmitModal
          onConfirm={() => submitMutation.mutate()}
          onCancel={() => setShowModal(false)}
          isSubmitting={submitMutation.isPending}
        />
      )}
    </>
  );
}

import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, FileText, Users, Folder, CheckSquare, BarChart2, FileSignature, DollarSign, LayoutDashboard } from "lucide-react";
import { Badge } from "@/design-system/components";
import { getLoan } from "@/services/api";
import type { Loan } from "@/types/loan";
import EFolderSection from "@/features/documents/EFolderSection";

type SectionKey =
  | "overview"
  | "borrowers"
  | "documents"
  | "conditions"
  | "aus"
  | "disclosures"
  | "closing";

interface NavSection {
  key: SectionKey;
  label: string;
  icon: React.ReactNode;
}

const NAV_SECTIONS: NavSection[] = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
  { key: "borrowers", label: "Borrowers", icon: <Users className="w-4 h-4" /> },
  { key: "documents", label: "Documents", icon: <Folder className="w-4 h-4" /> },
  { key: "conditions", label: "Conditions", icon: <CheckSquare className="w-4 h-4" /> },
  { key: "aus", label: "AUS Results", icon: <BarChart2 className="w-4 h-4" /> },
  { key: "disclosures", label: "Disclosures", icon: <FileSignature className="w-4 h-4" /> },
  { key: "closing", label: "Closing", icon: <DollarSign className="w-4 h-4" /> },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function LoanInfoCard({ loan }: { loan: Loan }) {
  return (
    <div className="p-4 border-b border-neutral-200">
      <div className="mb-3">
        <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">
          Loan #
        </p>
        <p className="font-mono font-semibold text-primary-700 text-sm mt-0.5">
          {loan.loan_number}
        </p>
      </div>
      <div className="mb-3">
        <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">
          Status
        </p>
        <div className="mt-1">
          <Badge status={loan.status} size="sm" />
        </div>
      </div>
      <div className="mb-3">
        <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">
          Loan Amount
        </p>
        <p className="font-semibold text-neutral-900 text-sm mt-0.5">
          {formatCurrency(loan.loan_amount)}
        </p>
      </div>
      <div className="mb-3">
        <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">
          Property
        </p>
        <p className="text-xs text-neutral-700 mt-0.5 leading-snug">
          {loan.property_address_line}
          <br />
          {loan.property_city}, {loan.property_state} {loan.property_zip}
        </p>
      </div>
      {loan.borrowers.length > 0 && (
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">
            Primary Borrower
          </p>
          <p className="text-sm text-neutral-900 mt-0.5">
            {loan.borrowers[0].first_name} {loan.borrowers[0].last_name}
          </p>
        </div>
      )}
    </div>
  );
}

function OverviewSection({ loan }: { loan: Loan }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-neutral-900 mb-6">
        Loan Overview
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Loan Details */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary-600" />
            Loan Details
          </h3>
          <dl className="space-y-3">
            {[
              { label: "Loan Number", value: loan.loan_number },
              { label: "Loan Amount", value: formatCurrency(loan.loan_amount) },
              { label: "Loan Type", value: loan.loan_type },
              { label: "Purpose", value: loan.loan_purpose_type },
              {
                label: "Note Rate",
                value: loan.note_rate_percent
                  ? `${loan.note_rate_percent}%`
                  : "TBD",
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <dt className="text-neutral-500">{label}</dt>
                <dd className="font-medium text-neutral-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Property Information */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-primary-600" />
            Property
          </h3>
          <dl className="space-y-3">
            {[
              { label: "Address", value: loan.property_address_line },
              {
                label: "City, State",
                value: `${loan.property_city}, ${loan.property_state}`,
              },
              { label: "ZIP Code", value: loan.property_zip },
              { label: "County", value: loan.property_county ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm gap-4">
                <dt className="text-neutral-500 shrink-0">{label}</dt>
                <dd className="font-medium text-neutral-900 text-right">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Key Dates */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-primary-600" />
            Key Dates
          </h3>
          <dl className="space-y-3">
            {[
              {
                label: "App Received",
                value: loan.application_received_date
                  ? new Date(
                      loan.application_received_date
                    ).toLocaleDateString()
                  : "Not set",
              },
              {
                label: "Est. Close Date",
                value: loan.estimated_close_date
                  ? new Date(loan.estimated_close_date).toLocaleDateString()
                  : "Not set",
              },
              {
                label: "Created",
                value: new Date(loan.created_at).toLocaleDateString(),
              },
              {
                label: "Last Updated",
                value: new Date(loan.updated_at).toLocaleDateString(),
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <dt className="text-neutral-500">{label}</dt>
                <dd className="font-medium text-neutral-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Borrowers preview */}
      {loan.borrowers.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-600" />
            Borrowers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loan.borrowers.map((borrower) => (
              <div key={borrower.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-neutral-900">
                      {borrower.first_name} {borrower.last_name}
                    </p>
                    <p className="text-sm text-neutral-500 mt-0.5">
                      {borrower.borrower_classification}
                    </p>
                  </div>
                  {borrower.credit_score && (
                    <div className="text-right">
                      <p className="text-xs text-neutral-500">Credit Score</p>
                      <p
                        className={`text-lg font-bold ${
                          borrower.credit_score >= 740
                            ? "text-green-700"
                            : borrower.credit_score >= 680
                            ? "text-yellow-700"
                            : "text-red-700"
                        }`}
                      >
                        {borrower.credit_score}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-3 text-sm text-neutral-600 space-y-1">
                  <p>{borrower.email}</p>
                  <p>{borrower.phone}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BorrowersSection({ loan }: { loan: Loan }) {
  const navigate = useNavigate();
  const primaryBorrower = loan.borrowers.find(
    (b) => b.borrower_classification === "Primary"
  );

  if (loan.borrowers.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">
          Borrowers
        </h2>
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-primary-600" />
          </div>
          <p className="text-neutral-600 font-medium">No borrowers on this loan</p>
          <p className="text-sm text-neutral-400 mt-1">
            Add a borrower to begin the loan application.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-neutral-900">Borrowers</h2>
        {primaryBorrower && (
          <button
            type="button"
            onClick={() =>
              navigate(
                `/loans/${loan.id}/urla?borrowerId=${primaryBorrower.id}&section=1`
              )
            }
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
          >
            <FileText className="w-4 h-4" aria-hidden="true" />
            Open Loan Application (URLA)
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loan.borrowers.map((borrower) => (
          <div key={borrower.id} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-neutral-900">
                  {borrower.first_name} {borrower.last_name}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {borrower.borrower_classification}
                </p>
              </div>
              {borrower.credit_score && (
                <div className="text-right">
                  <p className="text-xs text-neutral-500">Credit Score</p>
                  <p
                    className={`text-lg font-bold ${
                      borrower.credit_score >= 740
                        ? "text-green-700"
                        : borrower.credit_score >= 680
                        ? "text-yellow-700"
                        : "text-red-700"
                    }`}
                  >
                    {borrower.credit_score}
                  </p>
                </div>
              )}
            </div>

            <dl className="text-sm space-y-1.5 mb-4">
              <div className="flex items-center gap-2 text-neutral-600">
                <span className="text-neutral-400 text-xs">Email</span>
                <span>{borrower.email}</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-600">
                <span className="text-neutral-400 text-xs">Phone</span>
                <span>{borrower.phone}</span>
              </div>
            </dl>

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/loans/${loan.id}/urla?borrowerId=${borrower.id}&section=1`
                )
              }
              className="w-full flex items-center justify-center gap-1.5 py-2 border border-primary-300 text-primary-700 text-sm font-medium rounded-lg hover:bg-primary-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1"
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              Edit Application
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-xl">
        <p className="text-sm text-primary-800">
          <strong>URLA (Form 1003)</strong> — Click "Open Loan Application" or
          "Edit Application" above to complete the Uniform Residential Loan
          Application for any borrower. Progress is saved automatically.
        </p>
      </div>
    </div>
  );
}

function PlaceholderSection({ title }: { title: string }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-neutral-900 mb-4">{title}</h2>
      <div className="card p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-4">
          <FileText className="w-7 h-7 text-primary-600" />
        </div>
        <p className="text-neutral-600 font-medium">
          {title} section coming soon
        </p>
        <p className="text-sm text-neutral-400 mt-1">
          This section is under active development.
        </p>
      </div>
    </div>
  );
}

export default function LoanFilePage() {
  const { loanId } = useParams<{ loanId: string }>();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SectionKey>("overview");

  const {
    data: loan,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["loan", loanId],
    queryFn: () => getLoan(loanId!),
    enabled: Boolean(loanId),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-neutral-600">Loading loan file...</p>
        </div>
      </div>
    );
  }

  if (isError || !loan) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <p className="text-error font-semibold mb-2">Loan Not Found</p>
          <p className="text-sm text-neutral-600 mb-4">
            The loan you're looking for could not be loaded.
          </p>
          <Link
            to="/pipeline"
            className="text-primary-600 text-sm hover:underline"
          >
            Return to Pipeline
          </Link>
        </div>
      </div>
    );
  }

  const primaryBorrower = loan.borrowers.find(
    (b) => b.borrower_classification === "Primary"
  );
  const borrowerName = primaryBorrower
    ? `${primaryBorrower.first_name} ${primaryBorrower.last_name}`
    : "No Borrower";

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      {/* Top navigation */}
      <header className="bg-primary-800 text-white px-6 py-3 flex items-center gap-4 shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <span className="font-bold">LoanOrigination</span>
        </div>
      </header>

      {/* Breadcrumb + Loan header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4 shrink-0">
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex items-center gap-2 text-sm text-neutral-500">
            <li>
              <button
                onClick={() => navigate("/pipeline")}
                className="hover:text-primary-600 flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Pipeline
              </button>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-neutral-900 font-medium">{loan.loan_number}</li>
          </ol>
        </nav>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-neutral-900">
              {borrowerName}
            </h1>
            <span className="text-neutral-400">•</span>
            <span className="font-mono text-primary-700 font-medium text-sm">
              {loan.loan_number}
            </span>
            <Badge status={loan.status} size="sm" />
          </div>
        </div>
      </div>

      {/* Main content with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="w-60 bg-white border-r border-neutral-200 flex flex-col shrink-0 overflow-y-auto"
          aria-label="Loan file navigation"
        >
          {/* Loan info summary */}
          {loan && <LoanInfoCard loan={loan} />}

          {/* Navigation */}
          <nav className="p-2 flex-1">
            <ul className="space-y-0.5" role="list">
              {NAV_SECTIONS.map(({ key, label, icon }) => (
                <li key={key}>
                  <button
                    onClick={() => setActiveSection(key)}
                    aria-current={activeSection === key ? "page" : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium text-left transition-colors ${
                      activeSection === key
                        ? "bg-primary-100 text-primary-800"
                        : "text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    <span
                      className={
                        activeSection === key
                          ? "text-primary-600"
                          : "text-neutral-400"
                      }
                    >
                      {icon}
                    </span>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto" id="main-content">
          {activeSection === "overview" && <OverviewSection loan={loan} />}
          {activeSection === "borrowers" && (
            <BorrowersSection loan={loan} />
          )}
          {activeSection === "documents" && (
            <EFolderSection loanId={loan.id} />
          )}
          {activeSection === "conditions" && (
            <PlaceholderSection title="Conditions" />
          )}
          {activeSection === "aus" && (
            <PlaceholderSection title="AUS Results" />
          )}
          {activeSection === "disclosures" && (
            <PlaceholderSection title="Disclosures" />
          )}
          {activeSection === "closing" && (
            <PlaceholderSection title="Closing" />
          )}
        </main>
      </div>
    </div>
  );
}

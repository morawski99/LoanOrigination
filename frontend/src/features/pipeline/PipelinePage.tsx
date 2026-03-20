import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { Button, Badge } from "@/design-system/components";
import { getLoans } from "@/services/api";
import type { LoanListItem } from "@/types/loan";
import { LoanStatus, LoanPurposeType } from "@/types/loan";

const ALL_STATUSES = "all";

const STATUS_OPTIONS = [
  { value: ALL_STATUSES, label: "All Statuses" },
  { value: LoanStatus.NEW, label: "New" },
  { value: LoanStatus.IN_PROCESS, label: "In Process" },
  { value: LoanStatus.CONDITIONAL_APPROVAL, label: "Conditional Approval" },
  { value: LoanStatus.APPROVED, label: "Approved" },
  { value: LoanStatus.SUSPENDED, label: "Suspended" },
  { value: LoanStatus.DECLINED, label: "Declined" },
  { value: LoanStatus.WITHDRAWN, label: "Withdrawn" },
  { value: LoanStatus.FUNDED, label: "Funded" },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getLoanPurposeLabel(purpose: LoanPurposeType): string {
  const labels: Record<LoanPurposeType, string> = {
    [LoanPurposeType.PURCHASE]: "Purchase",
    [LoanPurposeType.REFINANCE]: "Refinance",
    [LoanPurposeType.CASH_OUT_REFINANCE]: "Cash-Out Refi",
    [LoanPurposeType.CONSTRUCTION_TO_PERMANENT]: "Construction",
  };
  return labels[purpose] ?? purpose;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-neutral-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export default function PipelinePage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["loans", statusFilter, search, page],
    queryFn: () =>
      getLoans({
        skip: page * pageSize,
        limit: pageSize,
        status: statusFilter !== ALL_STATUSES ? statusFilter : undefined,
        search: search.trim() || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const loans: LoanListItem[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Top navigation bar */}
      <header className="bg-primary-800 text-white px-6 py-3 flex items-center gap-4 shadow-md">
        <div className="flex items-center gap-2 mr-6">
          <svg
            className="w-6 h-6"
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
          <span className="font-bold text-lg tracking-tight">
            LoanOrigination
          </span>
        </div>
        <nav className="flex items-center gap-1" aria-label="Main navigation">
          {[
            { href: "/pipeline", label: "Pipeline" },
            { href: "/underwriting", label: "Underwriting" },
            { href: "/closing", label: "Closing" },
            { href: "/reports", label: "Reports" },
            { href: "/admin", label: "Admin" },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="px-3 py-1.5 rounded text-sm font-medium hover:bg-primary-700 transition-colors"
              aria-current={href === "/pipeline" ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <main className="page-container py-6" id="main-content">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              Loan Pipeline
            </h1>
            <p className="text-sm text-neutral-600 mt-0.5">
              {total > 0 ? `${total} loan${total !== 1 ? "s" : ""}` : ""}
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate("/loans/new")}
            aria-label="Create a new loan application"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            New Loan
          </Button>
        </div>

        {/* Filter bar */}
        <div className="card p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Search by borrower or loan #"
                aria-label="Search loans by borrower name or loan number"
                className="w-full h-10 pl-9 pr-3 rounded border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600"
              />
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal
                className="text-neutral-500 w-4 h-4 shrink-0"
                aria-hidden="true"
              />
              <label htmlFor="status-filter" className="sr-only">
                Filter by status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
                className="h-10 px-3 rounded border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 cursor-pointer"
              >
                {STATUS_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="w-full text-sm"
              aria-label="Loan pipeline"
              aria-busy={isLoading}
            >
              <thead>
                <tr className="bg-neutral-100 border-b border-neutral-200">
                  {[
                    "Loan #",
                    "Borrower",
                    "Loan Amount",
                    "Type",
                    "Status",
                    "LO",
                    "Days in Status",
                    "Actions",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wide whitespace-nowrap"
                      scope="col"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {isLoading ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : isError ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-error"
                    >
                      <p className="font-medium">
                        Failed to load loans. Please try again.
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {String(
                          error instanceof Error ? error.message : error
                        )}
                      </p>
                    </td>
                  </tr>
                ) : loans.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-16 text-center text-neutral-500"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center">
                          <Search className="w-5 h-5 text-neutral-400" />
                        </div>
                        <p className="font-medium text-neutral-700">
                          No loans found
                        </p>
                        <p className="text-sm">
                          {search || statusFilter !== ALL_STATUSES
                            ? "Try adjusting your filters."
                            : "Create your first loan to get started."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  loans.map((loan) => (
                    <tr
                      key={loan.id}
                      className="hover:bg-neutral-50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/loans/${loan.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          navigate(`/loans/${loan.id}`);
                        }
                      }}
                      tabIndex={0}
                      role="row"
                      aria-label={`Loan ${loan.loan_number}`}
                    >
                      <td className="px-4 py-3 font-mono text-primary-700 font-medium whitespace-nowrap">
                        {loan.loan_number}
                      </td>
                      <td className="px-4 py-3 text-neutral-900">
                        {loan.primary_borrower_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-neutral-900 font-medium whitespace-nowrap">
                        {formatCurrency(loan.loan_amount)}
                      </td>
                      <td className="px-4 py-3 text-neutral-700 whitespace-nowrap">
                        {getLoanPurposeLabel(loan.loan_purpose_type)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={loan.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-neutral-700">
                        {loan.assigned_lo_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">
                        {loan.days_in_status != null
                          ? `${loan.days_in_status}d`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/loans/${loan.id}`);
                          }}
                          aria-label={`View loan ${loan.loan_number}`}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-neutral-200 flex items-center justify-between text-sm text-neutral-600">
              <span>
                Showing {page * pageSize + 1}–
                {Math.min((page + 1) * pageSize, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Previous page"
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Last updated */}
        {data && !isLoading && (
          <p className="text-xs text-neutral-400 text-right mt-2">
            Last updated:{" "}
            {format(new Date(), "MMM d, yyyy 'at' h:mm a")}
          </p>
        )}
      </main>
    </div>
  );
}

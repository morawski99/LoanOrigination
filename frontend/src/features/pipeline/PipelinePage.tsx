import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus,
  Search,
  SlidersHorizontal,
  UserCheck,
  X,
  ChevronDown,
} from "lucide-react";
import { Button, Badge } from "@/design-system/components";
import { getLoans, updateLoan, getAssignableUsers } from "@/services/api";
import type { LoanListItem } from "@/types/loan";
import { LoanStatus, LoanType, LoanPurposeType } from "@/types/loan";
import type { UserResponse } from "@/types/user";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL = "all";

const STATUS_OPTIONS = [
  { value: ALL, label: "All Statuses" },
  { value: LoanStatus.NEW, label: "New" },
  { value: LoanStatus.IN_PROCESS, label: "In Process" },
  { value: LoanStatus.CONDITIONAL_APPROVAL, label: "Conditional Approval" },
  { value: LoanStatus.APPROVED, label: "Approved" },
  { value: LoanStatus.SUSPENDED, label: "Suspended" },
  { value: LoanStatus.DECLINED, label: "Declined" },
  { value: LoanStatus.WITHDRAWN, label: "Withdrawn" },
  { value: LoanStatus.FUNDED, label: "Funded" },
];

const LOAN_TYPE_OPTIONS = [
  { value: ALL, label: "All Types" },
  { value: LoanType.CONVENTIONAL, label: "Conventional" },
  { value: LoanType.FHA, label: "FHA" },
  { value: LoanType.VA, label: "VA" },
  { value: LoanType.USDA, label: "USDA" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// Color-code days-in-status: green < 7, yellow 7–14, red > 14
function DaysInStatus({ days }: { days: number | null | undefined }) {
  if (days == null) return <span className="text-neutral-400">—</span>;
  const colorClass =
    days < 7
      ? "text-green-700 bg-green-50"
      : days < 15
      ? "text-yellow-700 bg-yellow-50"
      : "text-red-700 bg-red-50";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${colorClass}`}
    >
      {days}d
    </span>
  );
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

// ─── Inline LO Assign cell ────────────────────────────────────────────────────

function AssignLOCell({
  loan,
  users,
}: {
  loan: LoanListItem;
  users: UserResponse[];
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const mutation = useMutation({
    mutationFn: (loId: string | null) =>
      updateLoan(loan.id, { assigned_lo_id: loId ?? undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      setOpen(false);
    },
  });

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const val = e.target.value;
    mutation.mutate(val === "" ? null : val);
  };

  if (open) {
    return (
      <div
        ref={ref}
        className="relative"
        onClick={(e) => e.stopPropagation()}
      >
        <select
          autoFocus
          defaultValue={
            users.find((u) => u.full_name === loan.assigned_lo_name)?.id ?? ""
          }
          onChange={handleSelect}
          disabled={mutation.isPending}
          className="w-44 h-8 px-2 text-xs border border-primary-400 rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">— Unassign —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setOpen(true);
      }}
      className="group/lo flex items-center gap-1 text-sm text-neutral-700 hover:text-primary-700 transition-colors max-w-[160px]"
      title="Click to assign a loan officer"
    >
      <span className="truncate">
        {loan.assigned_lo_name ?? (
          <span className="text-neutral-400 italic">Unassigned</span>
        )}
      </span>
      <ChevronDown className="w-3 h-3 text-neutral-400 group-hover/lo:text-primary-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const navigate = useNavigate();

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [loanTypeFilter, setLoanTypeFilter] = useState<string>(ALL);
  const [loFilter, setLoFilter] = useState<string>(ALL); // "all" | "unassigned" | <lo_id>
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Debounce search: wait 350ms after typing stops
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset page when filters change
  const resetPage = () => setPage(0);

  // Assignable users for LO dropdown
  const { data: assignableUsers = [] } = useQuery({
    queryKey: ["assignable-users"],
    queryFn: () => getAssignableUsers("LoanOfficer"),
    staleTime: 5 * 60 * 1000,
  });

  const loOptions = [
    { value: ALL, label: "All LOs" },
    { value: "unassigned", label: "Unassigned" },
    ...assignableUsers.map((u) => ({ value: u.id, label: u.full_name })),
  ];

  const queryParams = {
    skip: page * pageSize,
    limit: pageSize,
    status: statusFilter !== ALL ? statusFilter : undefined,
    loan_type: loanTypeFilter !== ALL ? loanTypeFilter : undefined,
    assigned_lo_id:
      loFilter !== ALL && loFilter !== "unassigned" ? loFilter : undefined,
    unassigned_only: loFilter === "unassigned" ? true : undefined,
    search: debouncedSearch.trim() || undefined,
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["loans", queryParams],
    queryFn: () => getLoans(queryParams),
    placeholderData: (prev) => prev,
  });

  const loans: LoanListItem[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const hasActiveFilters =
    statusFilter !== ALL ||
    loanTypeFilter !== ALL ||
    loFilter !== ALL ||
    debouncedSearch.trim() !== "";

  function clearFilters() {
    setStatusFilter(ALL);
    setLoanTypeFilter(ALL);
    setLoFilter(ALL);
    setSearchInput("");
    setDebouncedSearch("");
    setPage(0);
  }

  const selectClass =
    "h-10 px-3 rounded border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 cursor-pointer";

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Top navigation */}
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
            { href: "/compliance", label: "Compliance" },
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
            {!isLoading && (
              <p className="text-sm text-neutral-500 mt-0.5">
                {total > 0
                  ? `${total} loan${total !== 1 ? "s" : ""}${
                      hasActiveFilters ? " matching filters" : ""
                    }`
                  : hasActiveFilters
                  ? "No loans match the current filters"
                  : "No loans yet"}
              </p>
            )}
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
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-52 max-w-sm">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search borrower or loan #"
                aria-label="Search loans by borrower name or loan number"
                className="w-full h-10 pl-9 pr-3 rounded border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <SlidersHorizontal
                className="text-neutral-400 w-4 h-4 shrink-0"
                aria-hidden="true"
              />

              {/* Status filter */}
              <div>
                <label htmlFor="status-filter" className="sr-only">
                  Filter by status
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    resetPage();
                  }}
                  className={selectClass}
                >
                  {STATUS_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Loan type filter */}
              <div>
                <label htmlFor="type-filter" className="sr-only">
                  Filter by loan type
                </label>
                <select
                  id="type-filter"
                  value={loanTypeFilter}
                  onChange={(e) => {
                    setLoanTypeFilter(e.target.value);
                    resetPage();
                  }}
                  className={selectClass}
                >
                  {LOAN_TYPE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* LO filter */}
              <div>
                <label htmlFor="lo-filter" className="sr-only">
                  Filter by loan officer
                </label>
                <select
                  id="lo-filter"
                  value={loFilter}
                  onChange={(e) => {
                    setLoFilter(e.target.value);
                    resetPage();
                  }}
                  className={`${selectClass} min-w-36`}
                >
                  {loOptions.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 h-10 px-3 text-sm text-neutral-600 hover:text-neutral-900 border border-neutral-300 rounded bg-white hover:bg-neutral-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
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
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  {[
                    { label: "Loan #", width: "w-36" },
                    { label: "Borrower", width: "w-40" },
                    { label: "Amount", width: "w-28" },
                    { label: "Type", width: "w-28" },
                    { label: "Status", width: "w-36" },
                    { label: "Loan Officer", width: "w-44" },
                    { label: "Days in Status", width: "w-28" },
                    { label: "Actions", width: "w-20" },
                  ].map(({ label, width }) => (
                    <th
                      key={label}
                      className={`px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide whitespace-nowrap ${width}`}
                      scope="col"
                    >
                      {label}
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
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
                          <Search className="w-5 h-5 text-neutral-400" />
                        </div>
                        <p className="font-medium text-neutral-700">
                          No loans found
                        </p>
                        <p className="text-sm text-neutral-500">
                          {hasActiveFilters
                            ? "Try adjusting or clearing your filters."
                            : "Create your first loan to get started."}
                        </p>
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="text-sm text-primary-600 hover:underline"
                          >
                            Clear all filters
                          </button>
                        )}
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
                      {/* Loan # */}
                      <td className="px-4 py-3 font-mono text-primary-700 font-medium whitespace-nowrap">
                        {loan.loan_number}
                      </td>

                      {/* Borrower */}
                      <td className="px-4 py-3 text-neutral-900">
                        {loan.primary_borrower_name ?? (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-neutral-900 font-medium whitespace-nowrap">
                        {formatCurrency(loan.loan_amount)}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">
                        <span className="text-xs font-medium">
                          {loan.loan_type}
                        </span>
                        <span className="text-neutral-400 mx-1">·</span>
                        <span className="text-xs text-neutral-500">
                          {getLoanPurposeLabel(loan.loan_purpose_type)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <Badge status={loan.status} size="sm" />
                      </td>

                      {/* Loan Officer (inline assign) */}
                      <td className="px-4 py-3">
                        <AssignLOCell loan={loan} users={assignableUsers} />
                      </td>

                      {/* Days in status */}
                      <td className="px-4 py-3">
                        <DaysInStatus days={loan.days_in_status} />
                      </td>

                      {/* Actions */}
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
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Previous page"
                >
                  Previous
                </Button>
                <span className="text-xs text-neutral-500">
                  {page + 1} / {totalPages}
                </span>
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

        {/* Last updated / LO assignment hint */}
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-neutral-400 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" />
            Click the Loan Officer cell on any row to assign or reassign.
          </p>
          {data && !isLoading && (
            <p className="text-xs text-neutral-400">
              Last updated:{" "}
              {format(new Date(), "MMM d, yyyy 'at' h:mm a")}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

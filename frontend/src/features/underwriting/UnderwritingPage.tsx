import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  ClipboardCheck,
  Users,
  Clock,
  BarChart2,
  Gavel,
} from "lucide-react";
import { Button, Badge } from "@/design-system/components";
import {
  getUnderwritingQueue,
  getUnderwritingStats,
  assignUnderwriter,
  getAssignableUsers,
} from "@/services/api";
import type { UnderwritingQueueItem } from "@/types/loan";
import { LoanStatus, LoanType, LoanPurposeType } from "@/types/loan";
import type { UserResponse } from "@/types/user";
import DecisionDialog from "./DecisionDialog";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL = "all";

const STATUS_OPTIONS = [
  { value: ALL, label: "All Queue Statuses" },
  { value: LoanStatus.IN_PROCESS, label: "In Process" },
  { value: LoanStatus.CONDITIONAL_APPROVAL, label: "Conditional Approval" },
  { value: LoanStatus.SUSPENDED, label: "Suspended" },
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

function AUSBadge({
  finding,
  system,
}: {
  finding?: string;
  system?: string;
}) {
  if (!finding) return <span className="text-neutral-400 text-xs">—</span>;

  const isPositive =
    finding === "Approve/Eligible" ||
    finding === "Accept" ||
    finding === "Approve/Ineligible";
  const isRefer =
    finding === "Refer" ||
    finding === "Refer/Eligible" ||
    finding === "Refer with Caution";

  const colorClass = isPositive
    ? "text-green-700 bg-green-50 border-green-200"
    : isRefer
    ? "text-yellow-700 bg-yellow-50 border-yellow-200"
    : "text-red-700 bg-red-50 border-red-200";

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border ${colorClass}`}
      title={`${system}: ${finding}`}
    >
      <span className="font-semibold">{system}</span>
      <span className="text-[10px] opacity-75">·</span>
      {finding}
    </span>
  );
}

function ConditionsSummary({
  open,
  total,
}: {
  open: number;
  total: number;
}) {
  if (total === 0)
    return <span className="text-neutral-400 text-xs">None</span>;
  const allClear = open === 0;
  const colorClass = allClear
    ? "text-green-700"
    : "text-yellow-700";
  return (
    <span className={`text-xs font-medium ${colorClass}`}>
      {open}/{total} open
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse" aria-hidden="true">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-neutral-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ─── Inline underwriter assign cell ───────────────────────────────────────────

function AssignUWCell({
  loan,
  users,
}: {
  loan: UnderwritingQueueItem;
  users: UserResponse[];
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    mutationFn: (uwId: string | null) => assignUnderwriter(loan.id, uwId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["underwriting-queue"] });
      queryClient.invalidateQueries({ queryKey: ["underwriting-stats"] });
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
          defaultValue={loan.assigned_underwriter_id ?? ""}
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
      className="group/uw flex items-center gap-1 text-sm text-neutral-700 hover:text-primary-700 transition-colors max-w-[160px]"
      title="Click to assign an underwriter"
    >
      <span className="truncate">
        {loan.assigned_underwriter_name ?? (
          <span className="text-neutral-400 italic">Unassigned</span>
        )}
      </span>
      <ChevronDown className="w-3 h-3 text-neutral-400 group-hover/uw:text-primary-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

// ─── Stats cards ──────────────────────────────────────────────────────────────

function StatsCards() {
  const { data: stats } = useQuery({
    queryKey: ["underwriting-stats"],
    queryFn: getUnderwritingStats,
    staleTime: 30_000,
  });

  const cards = [
    {
      label: "In Queue",
      value: stats?.total_in_queue ?? "—",
      icon: ClipboardCheck,
      color: "text-primary-700",
      bg: "bg-primary-50 border-primary-200",
    },
    {
      label: "Unassigned",
      value: stats?.unassigned_count ?? "—",
      icon: Users,
      color: "text-yellow-700",
      bg: "bg-yellow-50 border-yellow-200",
    },
    {
      label: "Avg Days in Review",
      value: stats?.avg_days_in_status != null ? `${stats.avg_days_in_status}` : "—",
      icon: Clock,
      color: "text-blue-700",
      bg: "bg-blue-50 border-blue-200",
    },
    {
      label: "Cond. Approval",
      value: stats?.by_status?.["ConditionalApproval"] ?? 0,
      icon: BarChart2,
      color: "text-green-700",
      bg: "bg-green-50 border-green-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <div
          key={label}
          className={`rounded-xl border ${bg} px-4 py-3 flex items-center gap-3`}
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${color} bg-white/60`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-900">{value}</p>
            <p className="text-xs text-neutral-500 font-medium">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UnderwritingPage() {
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [loanTypeFilter, setLoanTypeFilter] = useState<string>(ALL);
  const [uwFilter, setUwFilter] = useState<string>(ALL);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Decision dialog state
  const [decisionLoan, setDecisionLoan] = useState<{
    id: string;
    number: string;
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const resetPage = () => setPage(0);

  const { data: uwUsers = [] } = useQuery({
    queryKey: ["assignable-users", "Underwriter"],
    queryFn: () => getAssignableUsers("Underwriter"),
    staleTime: 5 * 60 * 1000,
  });

  const uwOptions = [
    { value: ALL, label: "All Underwriters" },
    { value: "unassigned", label: "Unassigned" },
    ...uwUsers.map((u) => ({ value: u.id, label: u.full_name })),
  ];

  const queryParams = {
    skip: page * pageSize,
    limit: pageSize,
    status: statusFilter !== ALL ? statusFilter : undefined,
    loan_type: loanTypeFilter !== ALL ? loanTypeFilter : undefined,
    assigned_underwriter_id:
      uwFilter !== ALL && uwFilter !== "unassigned" ? uwFilter : undefined,
    unassigned_only: uwFilter === "unassigned" ? true : undefined,
    search: debouncedSearch.trim() || undefined,
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["underwriting-queue", queryParams],
    queryFn: () => getUnderwritingQueue(queryParams),
    placeholderData: (prev) => prev,
  });

  const loans: UnderwritingQueueItem[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const hasActiveFilters =
    statusFilter !== ALL ||
    loanTypeFilter !== ALL ||
    uwFilter !== ALL ||
    debouncedSearch.trim() !== "";

  function clearFilters() {
    setStatusFilter(ALL);
    setLoanTypeFilter(ALL);
    setUwFilter(ALL);
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
        <nav
          className="flex items-center gap-1"
          aria-label="Main navigation"
        >
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
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                href === "/underwriting"
                  ? "bg-primary-700"
                  : "hover:bg-primary-700"
              }`}
              aria-current={href === "/underwriting" ? "page" : undefined}
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
              Underwriting Queue
            </h1>
            {!isLoading && (
              <p className="text-sm text-neutral-500 mt-0.5">
                {total > 0
                  ? `${total} loan${total !== 1 ? "s" : ""}${
                      hasActiveFilters ? " matching filters" : " in queue"
                    }`
                  : hasActiveFilters
                  ? "No loans match the current filters"
                  : "No loans in the underwriting queue"}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <StatsCards />

        {/* Filter bar */}
        <div className="card p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center">
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
                aria-label="Search underwriting queue"
                className="w-full h-10 pl-9 pr-3 rounded border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <SlidersHorizontal
                className="text-neutral-400 w-4 h-4 shrink-0"
                aria-hidden="true"
              />

              <div>
                <label htmlFor="uw-status-filter" className="sr-only">
                  Filter by status
                </label>
                <select
                  id="uw-status-filter"
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

              <div>
                <label htmlFor="uw-type-filter" className="sr-only">
                  Filter by loan type
                </label>
                <select
                  id="uw-type-filter"
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

              <div>
                <label htmlFor="uw-user-filter" className="sr-only">
                  Filter by underwriter
                </label>
                <select
                  id="uw-user-filter"
                  value={uwFilter}
                  onChange={(e) => {
                    setUwFilter(e.target.value);
                    resetPage();
                  }}
                  className={`${selectClass} min-w-36`}
                >
                  {uwOptions.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

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
              aria-label="Underwriting queue"
              aria-busy={isLoading}
            >
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  {[
                    { label: "Loan #", width: "w-32" },
                    { label: "Borrower", width: "w-36" },
                    { label: "Amount", width: "w-28" },
                    { label: "Type", width: "w-28" },
                    { label: "Status", width: "w-36" },
                    { label: "Underwriter", width: "w-40" },
                    { label: "AUS Finding", width: "w-40" },
                    { label: "Conditions", width: "w-24" },
                    { label: "Days", width: "w-16" },
                    { label: "Actions", width: "w-24" },
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
                      colSpan={10}
                      className="px-4 py-10 text-center text-error"
                    >
                      <p className="font-medium">
                        Failed to load queue. Please try again.
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
                      colSpan={10}
                      className="px-4 py-16 text-center text-neutral-500"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
                          <ClipboardCheck className="w-5 h-5 text-neutral-400" />
                        </div>
                        <p className="font-medium text-neutral-700">
                          Queue is empty
                        </p>
                        <p className="text-sm text-neutral-500">
                          {hasActiveFilters
                            ? "Try adjusting or clearing your filters."
                            : "No loans are currently pending underwriting review."}
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
                      <td className="px-4 py-3 font-mono text-primary-700 font-medium whitespace-nowrap">
                        {loan.loan_number}
                      </td>

                      <td className="px-4 py-3 text-neutral-900">
                        {loan.primary_borrower_name ?? (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-neutral-900 font-medium whitespace-nowrap">
                        {formatCurrency(loan.loan_amount)}
                      </td>

                      <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">
                        <span className="text-xs font-medium">
                          {loan.loan_type}
                        </span>
                        <span className="text-neutral-400 mx-1">·</span>
                        <span className="text-xs text-neutral-500">
                          {getLoanPurposeLabel(loan.loan_purpose_type)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <Badge status={loan.status} size="sm" />
                      </td>

                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <AssignUWCell loan={loan} users={uwUsers} />
                      </td>

                      <td className="px-4 py-3">
                        <AUSBadge
                          finding={loan.latest_aus_finding}
                          system={loan.latest_aus_system}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <ConditionsSummary
                          open={loan.conditions_open}
                          total={loan.conditions_total}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <DaysInStatus days={loan.days_in_status} />
                      </td>

                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDecisionLoan({
                              id: loan.id,
                              number: loan.loan_number,
                            });
                          }}
                          aria-label={`Make decision on loan ${loan.loan_number}`}
                        >
                          <Gavel className="w-3.5 h-3.5 mr-1" />
                          Decide
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

        {/* Footer hint */}
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-neutral-400 flex items-center gap-1">
            <Gavel className="w-3.5 h-3.5" />
            Click "Decide" to record an underwriting decision on any loan.
          </p>
          {data && !isLoading && (
            <p className="text-xs text-neutral-400">
              Last updated:{" "}
              {format(new Date(), "MMM d, yyyy 'at' h:mm a")}
            </p>
          )}
        </div>
      </main>

      {/* Decision dialog */}
      {decisionLoan && (
        <DecisionDialog
          loanId={decisionLoan.id}
          loanNumber={decisionLoan.number}
          onClose={() => setDecisionLoan(null)}
        />
      )}
    </div>
  );
}

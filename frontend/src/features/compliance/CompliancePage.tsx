import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search,
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/design-system/components";
import {
  getComplianceDashboard,
  getHMDARecords,
  syncHMDARecords,
  validateHMDARecord,
  getAdverseActions,
  getTRIDExceptions,
} from "@/services/api";
import type {
  ComplianceDashboardStats,
  HMDAValidationStatus,
  AdverseActionNotice,
  AdverseActionStatus,
} from "@/types/compliance";
import {
  HMDAActionTakenLabels,
  AdverseActionTypeLabels,
  AdverseActionStatusLabels,
  AdverseActionReasonLabels,
} from "@/types/compliance";

// ─── Constants ────────────────────────────────────────────────────────────────

type TabId = "dashboard" | "hmda" | "adverse-actions" | "trid";

const TABS: { id: TabId; label: string; icon: typeof ShieldCheck }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart2 },
  { id: "hmda", label: "HMDA LAR", icon: FileText },
  { id: "adverse-actions", label: "Adverse Actions", icon: AlertTriangle },
  { id: "trid", label: "TRID Tolerance", icon: ShieldCheck },
];

const PAGE_SIZE = 20;

const NAV_LINKS = [
  { href: "/pipeline", label: "Pipeline" },
  { href: "/underwriting", label: "Underwriting" },
  { href: "/closing", label: "Closing" },
  { href: "/compliance", label: "Compliance" },
  { href: "/reports", label: "Reports" },
  { href: "/admin", label: "Admin" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return format(new Date(dateStr), "MM/dd/yyyy");
}

function ValidationBadge({ status }: { status: HMDAValidationStatus }) {
  const styles: Record<HMDAValidationStatus, { bg: string; text: string }> = {
    Pending: { bg: "bg-neutral-100", text: "text-neutral-600" },
    Valid: { bg: "bg-green-50", text: "text-green-700" },
    Errors: { bg: "bg-red-50", text: "text-red-700" },
    Warnings: { bg: "bg-yellow-50", text: "text-yellow-700" },
  };
  const s = styles[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${s.bg} ${s.text}`}
    >
      {status}
    </span>
  );
}

function AAStatusBadge({ status }: { status: AdverseActionStatus }) {
  const styles: Record<AdverseActionStatus, { bg: string; text: string }> = {
    Draft: { bg: "bg-neutral-100", text: "text-neutral-600" },
    PendingReview: { bg: "bg-yellow-50", text: "text-yellow-700" },
    Sent: { bg: "bg-green-50", text: "text-green-700" },
    Acknowledged: { bg: "bg-blue-50", text: "text-blue-700" },
  };
  const s = styles[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${s.bg} ${s.text}`}
    >
      {AdverseActionStatusLabels[status]}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-primary-700",
  bgColor = "bg-primary-50",
}: {
  label: string;
  value: number | string;
  icon: typeof ShieldCheck;
  color?: string;
  bgColor?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-neutral-900">{value}</p>
        <p className="text-xs text-neutral-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({ stats }: { stats: ComplianceDashboardStats | undefined }) {
  if (!stats) {
    return (
      <div className="py-12 text-center text-neutral-400">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Loan Activity */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wider">
          Loan Activity
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="In Process"
            value={stats.loans_in_process}
            icon={Clock}
            color="text-blue-700"
            bgColor="bg-blue-50"
          />
          <StatCard
            label="Originated"
            value={stats.loans_originated}
            icon={CheckCircle}
            color="text-green-700"
            bgColor="bg-green-50"
          />
          <StatCard
            label="Denied"
            value={stats.loans_denied}
            icon={XCircle}
            color="text-red-700"
            bgColor="bg-red-50"
          />
          <StatCard
            label="Withdrawn"
            value={stats.loans_withdrawn}
            icon={AlertTriangle}
            color="text-neutral-600"
            bgColor="bg-neutral-100"
          />
        </div>
      </div>

      {/* HMDA Compliance */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wider">
          HMDA Compliance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total LAR Records"
            value={stats.hmda_total_records}
            icon={FileText}
          />
          <StatCard
            label="Valid Records"
            value={stats.hmda_valid}
            icon={CheckCircle}
            color="text-green-700"
            bgColor="bg-green-50"
          />
          <StatCard
            label="Records with Errors"
            value={stats.hmda_errors}
            icon={XCircle}
            color="text-red-700"
            bgColor="bg-red-50"
          />
          <StatCard
            label="Pending Validation"
            value={stats.hmda_pending}
            icon={Clock}
            color="text-yellow-700"
            bgColor="bg-yellow-50"
          />
        </div>
      </div>

      {/* ECOA / Adverse Actions */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wider">
          ECOA Adverse Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Notices"
            value={stats.aa_total}
            icon={AlertTriangle}
          />
          <StatCard
            label="Pending to Send"
            value={stats.aa_pending_send}
            icon={Clock}
            color="text-yellow-700"
            bgColor="bg-yellow-50"
          />
          <StatCard
            label="Overdue (Past Deadline)"
            value={stats.aa_overdue}
            icon={XCircle}
            color="text-red-700"
            bgColor="bg-red-50"
          />
          <StatCard
            label="Sent This Month"
            value={stats.aa_sent_this_month}
            icon={CheckCircle}
            color="text-green-700"
            bgColor="bg-green-50"
          />
        </div>
      </div>

      {/* TRID */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wider">
          TRID Compliance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            label="Loans with Issued LE"
            value={stats.trid_total_loans_with_le}
            icon={FileText}
          />
          <StatCard
            label="Tolerance Exceptions"
            value={stats.trid_tolerance_exceptions}
            icon={AlertTriangle}
            color="text-red-700"
            bgColor="bg-red-50"
          />
          <StatCard
            label="LE Deadline Approaching"
            value={stats.trid_le_deadline_approaching}
            icon={Clock}
            color="text-yellow-700"
            bgColor="bg-yellow-50"
          />
        </div>
      </div>
    </div>
  );
}

// ─── HMDA LAR Tab ─────────────────────────────────────────────────────────────

function HMDATab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["hmda-records", page, search, statusFilter],
    queryFn: () =>
      getHMDARecords({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: search || undefined,
        validation_status: statusFilter === "all" ? undefined : statusFilter,
      }),
  });

  const syncMutation = useMutation({
    mutationFn: () => syncHMDARecords(new Date().getFullYear()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hmda-records"] });
      queryClient.invalidateQueries({ queryKey: ["compliance-dashboard"] });
    },
  });

  const validateMutation = useMutation({
    mutationFn: (loanId: string) => validateHMDARecord(loanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hmda-records"] });
      queryClient.invalidateQueries({ queryKey: ["compliance-dashboard"] });
    },
  });

  const records = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by loan number or borrower..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="text-sm border border-neutral-300 rounded-md px-3 py-2"
        >
          <option value="all">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Valid">Valid</option>
          <option value="Errors">Errors</option>
          <option value="Warnings">Warnings</option>
        </select>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          {syncMutation.isPending ? "Syncing..." : "Sync from Loans"}
        </Button>
        {syncMutation.isSuccess && (
          <span className="text-xs text-green-600">
            Created {syncMutation.data.created}, updated {syncMutation.data.updated}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">Loan #</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">Borrower</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">Action Taken</th>
                <th className="text-right px-4 py-3 font-semibold text-neutral-700">Amount</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">Rate</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">State</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">App Date</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">Validation</th>
                <th className="text-center px-4 py-3 font-semibold text-neutral-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-neutral-400">
                    Loading HMDA records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-neutral-400">
                    No HMDA records found. Click "Sync from Loans" to populate.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <a
                        href={`/loans/${r.loan_id}`}
                        className="text-primary-600 hover:underline font-mono text-xs"
                      >
                        {r.loan_number ?? "—"}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{r.borrower_name ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-700">
                      {r.action_taken ? HMDAActionTakenLabels[r.action_taken] : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-neutral-700">
                      {formatCurrency(r.loan_amount)}
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-700">
                      {r.interest_rate != null ? `${r.interest_rate}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{r.property_state ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-600">{formatDate(r.application_date)}</td>
                    <td className="px-4 py-3">
                      <ValidationBadge status={r.validation_status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        className="text-primary-600 hover:text-primary-800 text-xs font-medium"
                        onClick={() => validateMutation.mutate(r.loan_id)}
                        disabled={validateMutation.isPending}
                        title="Validate record"
                      >
                        Validate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 bg-neutral-50">
            <span className="text-xs text-neutral-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 rounded hover:bg-neutral-200 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-neutral-600 px-2">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1 rounded hover:bg-neutral-200 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Adverse Actions Tab ──────────────────────────────────────────────────────

function AdverseActionsTab() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["adverse-actions", page, search, statusFilter, overdueOnly],
    queryFn: () =>
      getAdverseActions({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        overdue_only: overdueOnly || undefined,
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function isOverdue(notice: AdverseActionNotice): boolean {
    if (notice.status === "Sent" || notice.status === "Acknowledged") return false;
    return new Date(notice.notice_deadline) < new Date();
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by loan number or borrower..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="text-sm border border-neutral-300 rounded-md px-3 py-2"
        >
          <option value="all">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="PendingReview">Pending Review</option>
          <option value="Sent">Sent</option>
          <option value="Acknowledged">Acknowledged</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-neutral-600 cursor-pointer">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => {
              setOverdueOnly(e.target.checked);
              setPage(0);
            }}
            className="rounded border-neutral-300"
          />
          Overdue only
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">Loan #</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">Borrower</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">Primary Reason</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">Decision Date</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">Deadline</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">Sent Date</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-neutral-400">
                    Loading adverse actions...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-neutral-400">
                    No adverse action notices found.
                  </td>
                </tr>
              ) : (
                items.map((aa) => (
                  <tr key={aa.id} className={`hover:bg-neutral-50 ${isOverdue(aa) ? "bg-red-50/50" : ""}`}>
                    <td className="px-4 py-3">
                      <a
                        href={`/loans/${aa.loan_id}`}
                        className="text-primary-600 hover:underline font-mono text-xs"
                      >
                        {aa.loan_number ?? "—"}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{aa.borrower_name ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-700">{AdverseActionTypeLabels[aa.action_type]}</td>
                    <td className="px-4 py-3 text-neutral-600 text-xs">
                      {aa.reason_code_1 ? AdverseActionReasonLabels[aa.reason_code_1] : "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{formatDate(aa.decision_date)}</td>
                    <td className="px-4 py-3">
                      <span className={isOverdue(aa) ? "text-red-700 font-semibold" : "text-neutral-600"}>
                        {formatDate(aa.notice_deadline)}
                      </span>
                      {isOverdue(aa) && (
                        <span className="ml-1 text-xs text-red-600 font-semibold">OVERDUE</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{formatDate(aa.sent_date)}</td>
                    <td className="px-4 py-3">
                      <AAStatusBadge status={aa.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 bg-neutral-50">
            <span className="text-xs text-neutral-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 rounded hover:bg-neutral-200 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-neutral-600 px-2">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1 rounded hover:bg-neutral-200 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TRID Tolerance Tab ───────────────────────────────────────────────────────

function TRIDTab() {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["trid-exceptions", page],
    queryFn: () =>
      getTRIDExceptions({ skip: page * PAGE_SIZE, limit: PAGE_SIZE }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">
        Loans where Closing Disclosure fees exceed Loan Estimate fees beyond TRID tolerance
        thresholds. Zero-tolerance fees (Sections A, B, E) may not increase from LE to CD.
      </p>

      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">Loan #</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">Borrower</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">Tolerance</th>
                <th className="text-right px-4 py-3 font-semibold text-neutral-700">LE Total</th>
                <th className="text-right px-4 py-3 font-semibold text-neutral-700">CD Total</th>
                <th className="text-right px-4 py-3 font-semibold text-neutral-700">Variance</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700">LE Issued</th>
                <th className="text-center px-4 py-3 font-semibold text-neutral-700">Violation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-neutral-400">
                    Loading TRID exceptions...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-neutral-400">
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-neutral-600 font-medium">No tolerance exceptions found</p>
                    <p className="text-xs text-neutral-400 mt-1">All loans are within TRID tolerance thresholds</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={`${item.loan_id}-${item.tolerance_category}`} className="hover:bg-neutral-50 bg-red-50/30">
                    <td className="px-4 py-3">
                      <a
                        href={`/loans/${item.loan_id}`}
                        className="text-primary-600 hover:underline font-mono text-xs"
                      >
                        {item.loan_number}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{item.borrower_name ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-600">{item.loan_status}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs font-semibold">
                        {item.tolerance_category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-neutral-700">
                      {formatCurrency(item.le_total)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-neutral-700">
                      {formatCurrency(item.cd_total)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-red-700 font-semibold">
                      +{formatCurrency(item.variance)}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{formatDate(item.le_issued_date)}</td>
                    <td className="px-4 py-3 text-center">
                      {item.is_violation && (
                        <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 bg-neutral-50">
            <span className="text-xs text-neutral-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 rounded hover:bg-neutral-200 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-neutral-600 px-2">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1 rounded hover:bg-neutral-200 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  const { data: stats } = useQuery({
    queryKey: ["compliance-dashboard"],
    queryFn: getComplianceDashboard,
  });

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
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                href === "/compliance"
                  ? "bg-primary-700"
                  : "hover:bg-primary-700"
              }`}
              aria-current={href === "/compliance" ? "page" : undefined}
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
              Compliance Center
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              HMDA, TRID, ECOA monitoring and reporting
            </p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 mb-6 border-b border-neutral-200">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "dashboard" && <DashboardTab stats={stats} />}
        {activeTab === "hmda" && <HMDATab />}
        {activeTab === "adverse-actions" && <AdverseActionsTab />}
        {activeTab === "trid" && <TRIDTab />}
      </main>
    </div>
  );
}

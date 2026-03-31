import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Pencil,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  UserX,
  Shield,
} from "lucide-react";
import { Button } from "@/design-system/components";
import { getUsers } from "@/services/api";
import type { UserResponse } from "@/types/user";
import CreateUserDialog from "./CreateUserDialog";
import EditUserDialog from "./EditUserDialog";
import ResetPasswordDialog from "./ResetPasswordDialog";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL = "all";
const PAGE_SIZE = 20;

const ROLE_OPTIONS = [
  { value: ALL, label: "All Roles" },
  { value: "LoanOfficer", label: "Loan Officer" },
  { value: "Processor", label: "Processor" },
  { value: "Underwriter", label: "Underwriter" },
  { value: "Closer", label: "Closer" },
  { value: "SecondaryMarketing", label: "Secondary Marketing" },
  { value: "BranchManager", label: "Branch Manager" },
  { value: "ComplianceOfficer", label: "Compliance Officer" },
  { value: "Admin", label: "Admin" },
];

const STATUS_OPTIONS = [
  { value: ALL, label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const ROLE_LABELS: Record<string, string> = {
  LoanOfficer: "Loan Officer",
  Processor: "Processor",
  Underwriter: "Underwriter",
  Closer: "Closer",
  SecondaryMarketing: "Secondary Mktg",
  BranchManager: "Branch Mgr",
  ComplianceOfficer: "Compliance",
  Admin: "Admin",
};

function roleBadgeColor(role: string): string {
  switch (role) {
    case "Admin":
      return "bg-red-50 text-red-700";
    case "Underwriter":
      return "bg-yellow-50 text-yellow-700";
    case "LoanOfficer":
      return "bg-blue-50 text-blue-700";
    case "Processor":
      return "bg-green-50 text-green-700";
    case "ComplianceOfficer":
      return "bg-purple-50 text-purple-700";
    default:
      return "bg-neutral-100 text-neutral-600";
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function StatsCards() {
  const { data } = useQuery({
    queryKey: ["users", { skip: 0, limit: 1 }],
    queryFn: () => getUsers({ skip: 0, limit: 1 }),
  });
  const { data: activeData } = useQuery({
    queryKey: ["users", { skip: 0, limit: 1, is_active: true }],
    queryFn: () => getUsers({ skip: 0, limit: 1, is_active: true }),
  });
  const { data: inactiveData } = useQuery({
    queryKey: ["users", { skip: 0, limit: 1, is_active: false }],
    queryFn: () => getUsers({ skip: 0, limit: 1, is_active: false }),
  });
  const { data: adminData } = useQuery({
    queryKey: ["users", { skip: 0, limit: 1, role: "Admin" }],
    queryFn: () => getUsers({ skip: 0, limit: 1, role: "Admin" }),
  });

  const stats = [
    {
      label: "Total Users",
      value: data?.total ?? "—",
      icon: Users,
      color: "text-primary-600",
      bg: "bg-primary-50",
    },
    {
      label: "Active",
      value: activeData?.total ?? "—",
      icon: UserCheck,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Inactive",
      value: inactiveData?.total ?? "—",
      icon: UserX,
      color: "text-neutral-500",
      bg: "bg-neutral-100",
    },
    {
      label: "Admins",
      value: adminData?.total ?? "—",
      icon: Shield,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={`${s.bg} p-2.5 rounded-lg`}>
              <Icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{s.value}</p>
              <p className="text-xs text-neutral-500">{s.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminPage() {
  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [page, setPage] = useState(0);

  // Dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [resetUser, setResetUser] = useState<UserResponse | null>(null);

  // Debounce search
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [searchInput]);

  const queryParams = {
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    ...(roleFilter !== ALL && { role: roleFilter }),
    ...(statusFilter !== ALL && {
      is_active: statusFilter === "active",
    }),
    ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
  };

  const { data, isLoading } = useQuery({
    queryKey: ["users", queryParams],
    queryFn: () => getUsers(queryParams),
    placeholderData: (prev) => prev,
  });

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hasActiveFilters =
    roleFilter !== ALL ||
    statusFilter !== ALL ||
    debouncedSearch.trim() !== "";

  function clearFilters() {
    setRoleFilter(ALL);
    setStatusFilter(ALL);
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
                href === "/admin"
                  ? "bg-primary-700"
                  : "hover:bg-primary-700"
              }`}
              aria-current={href === "/admin" ? "page" : undefined}
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
              User Management
            </h1>
            {!isLoading && (
              <p className="text-sm text-neutral-500 mt-0.5">
                {total > 0
                  ? `${total} user${total !== 1 ? "s" : ""}${
                      hasActiveFilters ? " matching filters" : ""
                    }`
                  : hasActiveFilters
                  ? "No users match the current filters"
                  : "No users found"}
              </p>
            )}
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add User
          </Button>
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
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full h-10 pl-9 pr-3 rounded border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(0);
              }}
              className={selectClass}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className={selectClass}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-primary-600 hover:text-primary-800 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="text-left font-semibold text-neutral-700 px-4 py-3">
                    Name
                  </th>
                  <th className="text-left font-semibold text-neutral-700 px-4 py-3">
                    Email
                  </th>
                  <th className="text-left font-semibold text-neutral-700 px-4 py-3">
                    Role
                  </th>
                  <th className="text-center font-semibold text-neutral-700 px-4 py-3">
                    Status
                  </th>
                  <th className="text-right font-semibold text-neutral-700 px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading && users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center text-neutral-400 py-12"
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center text-neutral-400 py-12"
                    >
                      {hasActiveFilters
                        ? "No users match the current filters."
                        : "No users found. Click \"Add User\" to create one."}
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {u.full_name}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {u.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${roleBadgeColor(u.role)}`}
                        >
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 text-neutral-400 hover:text-primary-600 rounded transition-colors"
                            title="Edit user"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setResetUser(u)}
                            className="p-1.5 text-neutral-400 hover:text-primary-600 rounded transition-colors"
                            title="Reset password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 bg-neutral-50/50">
              <p className="text-xs text-neutral-500">
                Showing {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1 rounded hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-neutral-600 px-2">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  className="p-1 rounded hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Dialogs */}
      {showCreate && (
        <CreateUserDialog onClose={() => setShowCreate(false)} />
      )}
      {editingUser && (
        <EditUserDialog
          user={editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}
      {resetUser && (
        <ResetPasswordDialog
          user={resetUser}
          onClose={() => setResetUser(null)}
        />
      )}
    </div>
  );
}

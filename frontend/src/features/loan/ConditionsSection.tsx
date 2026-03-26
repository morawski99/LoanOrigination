import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  MinusCircle,
} from "lucide-react";
import type { Condition, ConditionType, ConditionStatus } from "@/types/loan";
import {
  getConditions,
  createCondition,
  updateCondition,
  deleteCondition,
} from "@/services/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const CONDITION_TYPES: { key: ConditionType; label: string; abbr: string; description: string }[] = [
  { key: "PTA", label: "Prior to Approval", abbr: "PTA", description: "Must be satisfied before the loan can be approved" },
  { key: "PTD", label: "Prior to Docs", abbr: "PTD", description: "Must be satisfied before loan documents are drawn" },
  { key: "PTF", label: "Prior to Funding", abbr: "PTF", description: "Must be satisfied before the loan funds" },
];

const ASSIGNEES = ["Loan Officer", "Processor", "Underwriter", "Closer", "Borrower", "Title", "Appraiser"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: ConditionStatus) {
  const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold";
  switch (status) {
    case "Open":
      return <span className={`${base} bg-blue-100 text-blue-800`}>Open</span>;
    case "Cleared":
      return <span className={`${base} bg-green-100 text-green-800`}><Check className="w-3 h-3" />Cleared</span>;
    case "Waived":
      return <span className={`${base} bg-neutral-100 text-neutral-600`}><MinusCircle className="w-3 h-3" />Waived</span>;
  }
}

function formatDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

interface ConditionFormData {
  condition_type: ConditionType;
  description: string;
  due_date: string;
  assigned_to: string;
}

interface ConditionModalProps {
  initial?: Condition;
  onSave: (data: ConditionFormData) => void;
  onClose: () => void;
  isSaving: boolean;
}

function ConditionModal({ initial, onSave, onClose, isSaving }: ConditionModalProps) {
  const [form, setForm] = useState<ConditionFormData>({
    condition_type: initial?.condition_type ?? "PTA",
    description: initial?.description ?? "",
    due_date: initial?.due_date ?? "",
    assigned_to: initial?.assigned_to ?? "",
  });
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) {
      setError("Description is required.");
      return;
    }
    onSave(form);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label={initial ? "Edit condition" : "Add condition"}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-base font-semibold text-neutral-900">
            {initial ? "Edit Condition" : "Add Condition"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 space-y-4">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Condition Type <span className="text-error">*</span>
              </label>
              <div className="flex gap-2">
                {CONDITION_TYPES.map(({ key, abbr, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, condition_type: key }))}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1 ${
                      form.condition_type === key
                        ? "bg-primary-600 text-white border-primary-600"
                        : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    <span className="font-semibold">{abbr}</span>
                    <span className="block text-xs font-normal opacity-80 mt-0.5">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="cond-desc" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Description <span className="text-error">*</span>
              </label>
              <textarea
                id="cond-desc"
                rows={3}
                value={form.description}
                onChange={(e) => {
                  setForm((f) => ({ ...f, description: e.target.value }));
                  setError("");
                }}
                placeholder="Describe the condition requirement..."
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 resize-none"
              />
              {error && <p className="mt-1 text-xs text-error">{error}</p>}
            </div>

            {/* Due Date + Assigned To */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cond-due" className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Due Date
                </label>
                <input
                  id="cond-due"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
                />
              </div>
              <div>
                <label htmlFor="cond-assignee" className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Assigned To
                </label>
                <select
                  id="cond-assignee"
                  value={form.assigned_to}
                  onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 bg-white"
                >
                  <option value="">— Select —</option>
                  {ASSIGNEES.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1 disabled:opacity-60"
            >
              {isSaving ? "Saving…" : initial ? "Save Changes" : "Add Condition"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Condition Card ───────────────────────────────────────────────────────────

interface ConditionCardProps {
  condition: Condition;
  onEdit: (c: Condition) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ConditionStatus) => void;
}

function ConditionCard({ condition, onEdit, onDelete, onStatusChange }: ConditionCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        {/* Left: description + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-neutral-900 leading-snug mb-2">{condition.description}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
            {statusBadge(condition.status)}
            {condition.due_date && (
              <span>Due {formatDate(condition.due_date)}</span>
            )}
            {condition.assigned_to && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 inline-block" />
                {condition.assigned_to}
              </span>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 shrink-0">
          {condition.status === "Open" && (
            <>
              <button
                type="button"
                onClick={() => onStatusChange(condition.id, "Cleared")}
                title="Mark Cleared"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-1"
              >
                <Check className="w-3.5 h-3.5" />
                Clear
              </button>
              <button
                type="button"
                onClick={() => onStatusChange(condition.id, "Waived")}
                title="Mark Waived"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1"
              >
                <MinusCircle className="w-3.5 h-3.5" />
                Waive
              </button>
            </>
          )}
          {condition.status !== "Open" && (
            <button
              type="button"
              onClick={() => onStatusChange(condition.id, "Open")}
              title="Reopen"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1"
            >
              Reopen
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(condition)}
            title="Edit"
            className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-error font-medium">Delete?</span>
              <button
                type="button"
                onClick={() => onDelete(condition.id)}
                className="px-2 py-1 text-xs font-medium text-white bg-error rounded focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-1"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs font-medium text-neutral-600 bg-neutral-100 rounded focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              title="Delete"
              className="p-1.5 text-neutral-400 hover:text-error hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Collapsible Group ────────────────────────────────────────────────────────

interface ConditionGroupProps {
  type: typeof CONDITION_TYPES[number];
  conditions: Condition[];
  onAdd: (type: ConditionType) => void;
  onEdit: (c: Condition) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ConditionStatus) => void;
}

function ConditionGroup({ type, conditions, onAdd, onEdit, onDelete, onStatusChange }: ConditionGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const openCount = conditions.filter((c) => c.status === "Open").length;
  const clearedCount = conditions.filter((c) => c.status === "Cleared").length;
  const waived = conditions.filter((c) => c.status === "Waived").length;

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      {/* Group header */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-neutral-50 cursor-pointer select-none"
        onClick={() => setCollapsed((v) => !v)}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setCollapsed((v) => !v);
          }
        }}
      >
        <span className="flex-1 flex items-center gap-2">
          <span className="text-sm font-semibold text-neutral-900">{type.label}</span>
          <span className="font-mono text-xs text-neutral-500 bg-neutral-200 px-1.5 py-0.5 rounded font-medium">
            {type.abbr}
          </span>
          {/* Mini status counts */}
          <span className="flex items-center gap-1.5 ml-1">
            {openCount > 0 && (
              <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">
                {openCount} open
              </span>
            )}
            {clearedCount > 0 && (
              <span className="text-xs font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                {clearedCount} cleared
              </span>
            )}
            {waived > 0 && (
              <span className="text-xs font-semibold text-neutral-500 bg-neutral-200 px-1.5 py-0.5 rounded-full">
                {waived} waived
              </span>
            )}
            {conditions.length === 0 && (
              <span className="text-xs text-neutral-400">No conditions</span>
            )}
          </span>
        </span>

        {/* Add button (stop propagation so click doesn't toggle collapse) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAdd(type.key);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>

        <span className="text-neutral-400" aria-hidden="true">
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </span>
      </div>

      {/* Condition list */}
      {!collapsed && (
        <div className="p-4 space-y-3 bg-white">
          {conditions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-sm text-neutral-400">No {type.abbr} conditions yet.</p>
              <button
                type="button"
                onClick={() => onAdd(type.key)}
                className="mt-2 text-sm text-primary-600 hover:underline focus:outline-none"
              >
                Add the first one
              </button>
            </div>
          ) : (
            conditions.map((c) => (
              <ConditionCard
                key={c.id}
                condition={c}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Summary Tiles ────────────────────────────────────────────────────────────

function SummaryTiles({ conditions }: { conditions: Condition[] }) {
  const total = conditions.length;
  const open = conditions.filter((c) => c.status === "Open").length;
  const cleared = conditions.filter((c) => c.status === "Cleared").length;
  const waived = conditions.filter((c) => c.status === "Waived").length;

  const tiles = [
    { label: "Total", value: total, color: "text-neutral-900", bg: "bg-neutral-50 border-neutral-200" },
    { label: "Open", value: open, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
    { label: "Cleared", value: cleared, color: "text-green-700", bg: "bg-green-50 border-green-200" },
    { label: "Waived", value: waived, color: "text-neutral-500", bg: "bg-neutral-50 border-neutral-200" },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      {tiles.map(({ label, value, color, bg }) => (
        <div key={label} className={`rounded-xl border ${bg} px-4 py-3 text-center`}>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main ConditionsSection ───────────────────────────────────────────────────

interface ConditionsSectionProps {
  loanId: string;
}

export default function ConditionsSection({ loanId }: ConditionsSectionProps) {
  const queryClient = useQueryClient();

  const { data: conditions = [], isLoading, isError } = useQuery({
    queryKey: ["conditions", loanId],
    queryFn: () => getConditions(loanId),
  });

  const createMutation = useMutation({
    mutationFn: (data: { condition_type: ConditionType; description: string; due_date?: string; assigned_to?: string }) =>
      createCondition(loanId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conditions", loanId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ condition_type: ConditionType; description: string; status: ConditionStatus; due_date: string; assigned_to: string }> }) =>
      updateCondition(loanId, id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conditions", loanId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCondition(loanId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conditions", loanId] }),
  });

  const [modal, setModal] = useState<
    | { mode: "add"; defaultType: ConditionType }
    | { mode: "edit"; condition: Condition }
    | null
  >(null);

  const isMutating = createMutation.isPending || updateMutation.isPending;

  function handleSave(data: { condition_type: ConditionType; description: string; due_date: string; assigned_to: string }) {
    const payload = {
      condition_type: data.condition_type,
      description: data.description,
      due_date: data.due_date || undefined,
      assigned_to: data.assigned_to || undefined,
    };

    if (modal?.mode === "edit") {
      updateMutation.mutate(
        { id: modal.condition.id, data: payload },
        { onSuccess: () => setModal(null) }
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => setModal(null) });
    }
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id);
  }

  function handleStatusChange(id: string, status: ConditionStatus) {
    updateMutation.mutate({ id, data: { status } });
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-neutral-200 rounded-xl" />)}
          </div>
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-neutral-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <p className="text-sm text-error">Failed to load conditions. Please refresh and try again.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-primary-600" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-neutral-900">Conditions</h2>
        </div>
        <button
          type="button"
          onClick={() => setModal({ mode: "add", defaultType: "PTA" })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add Condition
        </button>
      </div>

      {/* Summary tiles */}
      <SummaryTiles conditions={conditions} />

      {/* Per-type collapsible groups */}
      <div className="space-y-4">
        {CONDITION_TYPES.map((type) => (
          <ConditionGroup
            key={type.key}
            type={type}
            conditions={conditions.filter((c) => c.condition_type === type.key)}
            onAdd={(t) => setModal({ mode: "add", defaultType: t })}
            onEdit={(c) => setModal({ mode: "edit", condition: c })}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <ConditionModal
          initial={modal.mode === "edit" ? modal.condition : undefined}
          onSave={handleSave}
          onClose={() => setModal(null)}
          isSaving={isMutating}
        />
      )}
    </div>
  );
}

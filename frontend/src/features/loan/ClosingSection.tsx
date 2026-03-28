import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  FileText,
  CheckSquare,
  Landmark,
  Banknote,
  Plus,
  Check,
  X,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MinusCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import {
  getClosingDisclosures,
  createClosingDisclosure,
  issueClosingDisclosure,
  getToleranceCheck,
  getClosingChecklist,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  getWireInstructions,
  upsertWireInstructions,
  getFundingStatus,
  upsertFundingStatus,
} from "@/services/api";
import type {
  CDListItem,
  ChecklistItemCreatePayload,
  ChecklistCategory,
  ChecklistItemStatus,
  WireInstructionPayload,
  FundingStatusPayload,
  ToleranceCheckResult,
} from "@/types/closing";
import {
  CDStatus,
  ChecklistCategory as CC,
  ChecklistItemStatus as CIS,
  FundingStatusType,
  CHECKLIST_CATEGORY_LABELS,
  FUNDING_STATUS_LABELS,
  DEFAULT_CHECKLIST_ITEMS,
} from "@/types/closing";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount?: number | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso + (iso.includes("T") ? "" : "T00:00:00")).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function cdStatusBadge(status: CDStatus) {
  const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold";
  switch (status) {
    case CDStatus.DRAFT:
      return <span className={`${base} bg-amber-100 text-amber-800`}>Draft</span>;
    case CDStatus.ISSUED:
      return <span className={`${base} bg-green-100 text-green-800`}>Issued</span>;
    case CDStatus.REVISED:
      return <span className={`${base} bg-blue-100 text-blue-800`}>Revised</span>;
    case CDStatus.SUPERSEDED:
      return <span className={`${base} bg-neutral-100 text-neutral-500`}>Superseded</span>;
  }
}

// ─── Sub-Tab Navigation ───────────────────────────────────────────────────────

type SubTab = "disclosure" | "checklist" | "wire" | "funding";

const SUB_TABS: { key: SubTab; label: string; icon: React.ReactNode }[] = [
  { key: "disclosure", label: "Closing Disclosure", icon: <FileText className="w-4 h-4" /> },
  { key: "checklist", label: "Checklist", icon: <CheckSquare className="w-4 h-4" /> },
  { key: "wire", label: "Wire Instructions", icon: <Landmark className="w-4 h-4" /> },
  { key: "funding", label: "Funding", icon: <Banknote className="w-4 h-4" /> },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Closing Disclosure Sub-Tab
// ═══════════════════════════════════════════════════════════════════════════════

function ClosingDisclosureTab({ loanId }: { loanId: string }) {
  const queryClient = useQueryClient();

  const { data: disclosures = [], isLoading } = useQuery({
    queryKey: ["closing-disclosures", loanId],
    queryFn: () => getClosingDisclosures(loanId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createClosingDisclosure(loanId, {
        loan_term_months: 360,
        deposit: 0,
        seller_credits: 0,
        lender_credits: 0,
        fees: [],
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["closing-disclosures", loanId] }),
  });

  const issueMutation = useMutation({
    mutationFn: ({ cdId }: { cdId: string }) =>
      issueClosingDisclosure(loanId, cdId, {
        issued_date: new Date().toISOString().split("T")[0],
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["closing-disclosures", loanId] }),
  });

  const [toleranceResult, setToleranceResult] = useState<ToleranceCheckResult | null>(null);
  const [toleranceCdId, setToleranceCdId] = useState<string | null>(null);

  async function handleToleranceCheck(cdId: string) {
    try {
      const result = await getToleranceCheck(loanId, cdId);
      setToleranceResult(result);
      setToleranceCdId(cdId);
    } catch {
      setToleranceResult(null);
      setToleranceCdId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {disclosures.length === 0
            ? "No Closing Disclosures yet. Create one from the latest Loan Estimate."
            : `${disclosures.length} version${disclosures.length > 1 ? "s" : ""}`}
        </p>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
        >
          <Plus className="w-4 h-4" />
          {createMutation.isPending ? "Creating…" : "New CD from LE"}
        </button>
      </div>

      {/* CD List */}
      {disclosures.map((cd: CDListItem) => (
        <div
          key={cd.id}
          className="border border-neutral-200 rounded-xl p-4 bg-white shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-neutral-900">
                  CD v{cd.version_number}
                </span>
                {cdStatusBadge(cd.status)}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-neutral-500">
                <div>
                  <p className="font-medium text-neutral-700">Closing Costs</p>
                  <p className="text-neutral-900">{formatCurrency(cd.total_closing_costs)}</p>
                </div>
                <div>
                  <p className="font-medium text-neutral-700">Cash to Close</p>
                  <p className="text-neutral-900">{formatCurrency(cd.cash_to_close)}</p>
                </div>
                <div>
                  <p className="font-medium text-neutral-700">Monthly Payment</p>
                  <p className="text-neutral-900">{formatCurrency(cd.total_monthly_payment)}</p>
                </div>
                <div>
                  <p className="font-medium text-neutral-700">Closing Date</p>
                  <p className="text-neutral-900">{formatDate(cd.closing_date)}</p>
                </div>
              </div>
              {cd.cd_delivery_deadline && (
                <p className="mt-2 text-xs text-neutral-500">
                  Delivery deadline: {formatDate(cd.cd_delivery_deadline)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {cd.status === CDStatus.DRAFT && (
                <button
                  type="button"
                  onClick={() => issueMutation.mutate({ cdId: cd.id })}
                  disabled={issueMutation.isPending}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-60"
                >
                  <Check className="w-3.5 h-3.5" />
                  Issue
                </button>
              )}
              <button
                type="button"
                onClick={() => handleToleranceCheck(cd.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Tolerance
              </button>
            </div>
          </div>

          {/* Tolerance result inline */}
          {toleranceCdId === cd.id && toleranceResult && (
            <div className="mt-3 pt-3 border-t border-neutral-100">
              {toleranceResult.zero_violations.length === 0 && !toleranceResult.ten_pct_exceeded ? (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  All fees within tolerance — no cure required.
                </div>
              ) : (
                <div className="space-y-2">
                  {toleranceResult.zero_violations.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-red-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Zero-tolerance violations (cure: {formatCurrency(toleranceResult.cure_amount)})
                      </p>
                      {toleranceResult.zero_violations.map((v) => (
                        <p key={v.fee_name} className="text-xs text-red-600 ml-5">
                          {v.fee_name}: LE {formatCurrency(v.original)} → CD {formatCurrency(v.revised)} (+{formatCurrency(v.increase)})
                        </p>
                      ))}
                    </div>
                  )}
                  {toleranceResult.ten_pct_exceeded && (
                    <p className="text-xs text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      10% aggregate bucket exceeded: LE {formatCurrency(toleranceResult.ten_pct_bucket_original)} → CD {formatCurrency(toleranceResult.ten_pct_bucket_revised)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Checklist Sub-Tab
// ═══════════════════════════════════════════════════════════════════════════════

function ChecklistTab({ loanId }: { loanId: string }) {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["closing-checklist", loanId],
    queryFn: () => getClosingChecklist(loanId),
  });

  const createMutation = useMutation({
    mutationFn: (data: ChecklistItemCreatePayload) => createChecklistItem(loanId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["closing-checklist", loanId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateChecklistItem(loanId, id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["closing-checklist", loanId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteChecklistItem(loanId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["closing-checklist", loanId] }),
  });

  const [addingCategory, setAddingCategory] = useState<ChecklistCategory | null>(null);
  const [newDesc, setNewDesc] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  function handleSeedDefaults() {
    DEFAULT_CHECKLIST_ITEMS.forEach((item, i) => {
      createMutation.mutate({ ...item, sort_order: i });
    });
  }

  function toggleCollapse(cat: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function statusIcon(status: ChecklistItemStatus) {
    switch (status) {
      case CIS.COMPLETE:
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case CIS.PENDING:
        return <Clock className="w-4 h-4 text-amber-500" />;
      case CIS.NA:
        return <MinusCircle className="w-4 h-4 text-neutral-400" />;
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  const total = items.length;
  const complete = items.filter((i) => i.status === CIS.COMPLETE).length;
  const pending = items.filter((i) => i.status === CIS.PENDING).length;
  const na = items.filter((i) => i.status === CIS.NA).length;

  const categories = Object.values(CC);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: total, color: "text-neutral-900", bg: "bg-neutral-50 border-neutral-200" },
          { label: "Pending", value: pending, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
          { label: "Complete", value: complete, color: "text-green-700", bg: "bg-green-50 border-green-200" },
          { label: "N/A", value: na, color: "text-neutral-500", bg: "bg-neutral-50 border-neutral-200" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border ${bg} px-4 py-3 text-center`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-neutral-500 mb-3">No checklist items yet.</p>
          <button
            type="button"
            onClick={handleSeedDefaults}
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            Load Default Checklist
          </button>
        </div>
      )}

      {/* Groups */}
      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category === cat);
        if (catItems.length === 0 && items.length > 0) return null;
        if (items.length === 0) return null;
        const collapsed = collapsedGroups.has(cat);
        const catComplete = catItems.filter((i) => i.status === CIS.COMPLETE).length;

        return (
          <div key={cat} className="border border-neutral-200 rounded-xl overflow-hidden">
            <div
              className="flex items-center gap-3 px-4 py-3 bg-neutral-50 cursor-pointer select-none"
              onClick={() => toggleCollapse(cat)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleCollapse(cat);
                }
              }}
            >
              <span className="flex-1 flex items-center gap-2">
                <span className="text-sm font-semibold text-neutral-900">
                  {CHECKLIST_CATEGORY_LABELS[cat]}
                </span>
                <span className="text-xs text-neutral-500">
                  {catComplete}/{catItems.length} complete
                </span>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddingCategory(cat);
                  setNewDesc("");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
              <span className="text-neutral-400">
                {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </span>
            </div>

            {!collapsed && (
              <div className="divide-y divide-neutral-100">
                {catItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3 bg-white">
                    <button
                      type="button"
                      onClick={() => {
                        const next =
                          item.status === CIS.PENDING
                            ? CIS.COMPLETE
                            : item.status === CIS.COMPLETE
                            ? CIS.NA
                            : CIS.PENDING;
                        const completedDate = next === CIS.COMPLETE
                          ? new Date().toISOString().split("T")[0]
                          : undefined;
                        updateMutation.mutate({
                          id: item.id,
                          data: { status: next, completed_date: completedDate },
                        });
                      }}
                      className="shrink-0"
                      title={`Status: ${item.status}`}
                    >
                      {statusIcon(item.status)}
                    </button>
                    <span
                      className={`flex-1 text-sm ${
                        item.status === CIS.COMPLETE
                          ? "text-neutral-400 line-through"
                          : item.status === CIS.NA
                          ? "text-neutral-400 italic"
                          : "text-neutral-900"
                      }`}
                    >
                      {item.description}
                    </span>
                    {item.assigned_to && (
                      <span className="text-xs text-neutral-400">{item.assigned_to}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(item.id)}
                      className="p-1 text-neutral-300 hover:text-error transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Inline add */}
                {addingCategory === cat && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-primary-50/30">
                    <input
                      type="text"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Describe the checklist item…"
                      className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newDesc.trim()) {
                          createMutation.mutate({ category: cat, description: newDesc.trim() });
                          setAddingCategory(null);
                          setNewDesc("");
                        }
                        if (e.key === "Escape") setAddingCategory(null);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newDesc.trim()) {
                          createMutation.mutate({ category: cat, description: newDesc.trim() });
                          setAddingCategory(null);
                          setNewDesc("");
                        }
                      }}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingCategory(null)}
                      className="p-1.5 text-neutral-400 hover:bg-neutral-100 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Wire Instructions Sub-Tab
// ═══════════════════════════════════════════════════════════════════════════════

function WireInstructionsTab({ loanId }: { loanId: string }) {
  const queryClient = useQueryClient();

  const { data: wire, isLoading, isError } = useQuery({
    queryKey: ["wire-instructions", loanId],
    queryFn: () => getWireInstructions(loanId),
    retry: false,
  });

  const upsertMutation = useMutation({
    mutationFn: (data: WireInstructionPayload) => upsertWireInstructions(loanId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wire-instructions", loanId] }),
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<WireInstructionPayload>({
    beneficiary_name: "",
    beneficiary_address: "",
    bank_name: "",
    aba_routing_number: "",
    account_number: "",
    reference_number: "",
    special_instructions: "",
  });

  function startEdit() {
    if (wire) {
      setForm({
        beneficiary_name: wire.beneficiary_name,
        beneficiary_address: wire.beneficiary_address || "",
        bank_name: wire.bank_name,
        aba_routing_number: wire.aba_routing_number,
        account_number: wire.account_number,
        reference_number: wire.reference_number || "",
        special_instructions: wire.special_instructions || "",
      });
    }
    setEditing(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    upsertMutation.mutate(form, { onSuccess: () => setEditing(false) });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  const noData = isError || !wire;

  if ((noData && !editing) || editing) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        {noData && !editing && (
          <div className="text-center py-8">
            <p className="text-sm text-neutral-500 mb-3">No wire instructions on file.</p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Wire Instructions
            </button>
          </div>
        )}
        {editing && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-1">Beneficiary Name *</label>
                <input
                  type="text"
                  required
                  value={form.beneficiary_name}
                  onChange={(e) => setForm((f) => ({ ...f, beneficiary_name: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-1">Beneficiary Address</label>
                <input
                  type="text"
                  value={form.beneficiary_address}
                  onChange={(e) => setForm((f) => ({ ...f, beneficiary_address: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-1">Bank Name *</label>
                <input
                  type="text"
                  required
                  value={form.bank_name}
                  onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">ABA Routing # *</label>
                <input
                  type="text"
                  required
                  maxLength={9}
                  pattern="\d{9}"
                  value={form.aba_routing_number}
                  onChange={(e) => setForm((f) => ({ ...f, aba_routing_number: e.target.value.replace(/\D/g, "").slice(0, 9) }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="123456789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Account # *</label>
                <input
                  type="text"
                  required
                  value={form.account_number}
                  onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Reference #</label>
                <input
                  type="text"
                  value={form.reference_number}
                  onChange={(e) => setForm((f) => ({ ...f, reference_number: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-1">Special Instructions</label>
                <textarea
                  rows={2}
                  value={form.special_instructions}
                  onChange={(e) => setForm((f) => ({ ...f, special_instructions: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={upsertMutation.isPending}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
              >
                {upsertMutation.isPending ? "Saving…" : "Save"}
              </button>
              {wire && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </>
        )}
      </form>
    );
  }

  // Display mode — wire is guaranteed defined here
  if (!wire) return null;
  return (
    <div className="max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {wire.verified ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
              <ShieldCheck className="w-3 h-3" /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              <AlertTriangle className="w-3 h-3" /> Unverified
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={startEdit}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
      </div>

      <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100 bg-white">
        {[
          { label: "Beneficiary", value: wire.beneficiary_name },
          { label: "Address", value: wire.beneficiary_address || "—" },
          { label: "Bank", value: wire.bank_name },
          { label: "ABA Routing #", value: wire.aba_routing_number, mono: true },
          { label: "Account #", value: wire.account_number, mono: true },
          { label: "Reference #", value: wire.reference_number || "—" },
          { label: "Special Instructions", value: wire.special_instructions || "—" },
        ].map(({ label, value, mono }) => (
          <div key={label} className="flex px-4 py-3">
            <span className="w-40 text-sm font-medium text-neutral-500 shrink-0">{label}</span>
            <span className={`text-sm text-neutral-900 ${mono ? "font-mono" : ""}`}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Funding Status Sub-Tab
// ═══════════════════════════════════════════════════════════════════════════════

function FundingTab({ loanId }: { loanId: string }) {
  const queryClient = useQueryClient();

  const { data: funding, isLoading, isError } = useQuery({
    queryKey: ["funding-status", loanId],
    queryFn: () => getFundingStatus(loanId),
    retry: false,
  });

  const upsertMutation = useMutation({
    mutationFn: (data: FundingStatusPayload) => upsertFundingStatus(loanId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["funding-status", loanId] }),
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FundingStatusPayload>({
    status: FundingStatusType.NOT_READY,
    scheduled_date: "",
    funded_date: "",
    funded_amount: undefined,
    confirmation_number: "",
    funding_source: "",
    notes: "",
  });

  function startEdit() {
    if (funding) {
      setForm({
        status: funding.status,
        scheduled_date: funding.scheduled_date || "",
        funded_date: funding.funded_date || "",
        funded_amount: funding.funded_amount || undefined,
        confirmation_number: funding.confirmation_number || "",
        funding_source: funding.funding_source || "",
        notes: funding.notes || "",
      });
    }
    setEditing(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: FundingStatusPayload = {
      ...form,
      scheduled_date: form.scheduled_date || undefined,
      funded_date: form.funded_date || undefined,
      funded_amount: form.funded_amount || undefined,
      confirmation_number: form.confirmation_number || undefined,
      funding_source: form.funding_source || undefined,
      notes: form.notes || undefined,
    };
    upsertMutation.mutate(payload, { onSuccess: () => setEditing(false) });
  }

  function statusColor(s: FundingStatusType) {
    switch (s) {
      case FundingStatusType.NOT_READY: return "bg-neutral-100 text-neutral-600";
      case FundingStatusType.SCHEDULED: return "bg-blue-100 text-blue-800";
      case FundingStatusType.FUNDED: return "bg-green-100 text-green-800";
      case FundingStatusType.SUSPENDED: return "bg-red-100 text-red-800";
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  const noData = isError || !funding;

  if (noData && !editing) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-neutral-500 mb-3">Funding status not yet tracked.</p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Set Funding Status
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-neutral-700 mb-1">Status *</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FundingStatusType }))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              {Object.values(FundingStatusType).map((s) => (
                <option key={s} value={s}>{FUNDING_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Scheduled Date</label>
            <input
              type="date"
              value={form.scheduled_date}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Funded Date</label>
            <input
              type="date"
              value={form.funded_date}
              onChange={(e) => setForm((f) => ({ ...f, funded_date: e.target.value }))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Funded Amount</label>
            <input
              type="number"
              step="0.01"
              value={form.funded_amount ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, funded_amount: e.target.value ? parseFloat(e.target.value) : undefined }))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Confirmation #</label>
            <input
              type="text"
              value={form.confirmation_number}
              onChange={(e) => setForm((f) => ({ ...f, confirmation_number: e.target.value }))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-neutral-700 mb-1">Funding Source</label>
            <input
              type="text"
              value={form.funding_source}
              onChange={(e) => setForm((f) => ({ ...f, funding_source: e.target.value }))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              placeholder="e.g. Warehouse Line — ABC Bank"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-neutral-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={upsertMutation.isPending}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {upsertMutation.isPending ? "Saving…" : "Save"}
          </button>
          {funding && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-sm font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    );
  }

  // Display mode
  return (
    <div className="max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${statusColor(funding!.status)}`}>
          {FUNDING_STATUS_LABELS[funding!.status]}
        </span>
        <button
          type="button"
          onClick={startEdit}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
      </div>

      <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100 bg-white">
        {[
          { label: "Scheduled Date", value: formatDate(funding!.scheduled_date) },
          { label: "Funded Date", value: formatDate(funding!.funded_date) },
          { label: "Funded Amount", value: formatCurrency(funding!.funded_amount) },
          { label: "Confirmation #", value: funding!.confirmation_number || "—" },
          { label: "Funding Source", value: funding!.funding_source || "—" },
          { label: "Notes", value: funding!.notes || "—" },
        ].map(({ label, value }) => (
          <div key={label} className="flex px-4 py-3">
            <span className="w-40 text-sm font-medium text-neutral-500 shrink-0">{label}</span>
            <span className="text-sm text-neutral-900">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main ClosingSection
// ═══════════════════════════════════════════════════════════════════════════════

interface ClosingSectionProps {
  loanId: string;
}

export default function ClosingSection({ loanId }: ClosingSectionProps) {
  const [activeTab, setActiveTab] = useState<SubTab>("checklist");

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <DollarSign className="w-5 h-5 text-primary-600" />
        <h2 className="text-xl font-semibold text-neutral-900">Closing</h2>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-neutral-200 mb-6">
        {SUB_TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === key
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "disclosure" && <ClosingDisclosureTab loanId={loanId} />}
      {activeTab === "checklist" && <ChecklistTab loanId={loanId} />}
      {activeTab === "wire" && <WireInstructionsTab loanId={loanId} />}
      {activeTab === "funding" && <FundingTab loanId={loanId} />}
    </div>
  );
}

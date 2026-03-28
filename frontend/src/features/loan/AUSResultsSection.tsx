import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart2,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Trash2,
  FileText,
} from "lucide-react";
import { getAUSResults, createAUSResult, deleteAUSResult } from "@/services/api";
import type {
  AUSResult,
  AUSSystem,
  AUSFinding,
  AUSResultCreatePayload,
} from "@/types/loan";

// ─── Finding configuration ────────────────────────────────────────────────────

interface FindingConfig {
  label: string;
  colorClass: string;          // badge bg + text
  borderClass: string;         // card border accent
  bgClass: string;             // banner bg
  icon: React.ReactNode;
}

const FINDING_CONFIG: Record<AUSFinding, FindingConfig> = {
  "Approve/Eligible": {
    label: "Approve/Eligible",
    colorClass: "bg-green-100 text-green-800",
    borderClass: "border-l-green-500",
    bgClass: "bg-green-50",
    icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
  },
  "Accept": {
    label: "Accept",
    colorClass: "bg-green-100 text-green-800",
    borderClass: "border-l-green-500",
    bgClass: "bg-green-50",
    icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
  },
  "Refer/Eligible": {
    label: "Refer/Eligible",
    colorClass: "bg-blue-100 text-blue-800",
    borderClass: "border-l-blue-500",
    bgClass: "bg-blue-50",
    icon: <Clock className="w-5 h-5 text-blue-600" />,
  },
  "Refer": {
    label: "Refer",
    colorClass: "bg-yellow-100 text-yellow-800",
    borderClass: "border-l-yellow-500",
    bgClass: "bg-yellow-50",
    icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
  },
  "Refer with Caution": {
    label: "Refer with Caution",
    colorClass: "bg-orange-100 text-orange-800",
    borderClass: "border-l-orange-500",
    bgClass: "bg-orange-50",
    icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
  },
  "Caution": {
    label: "Caution",
    colorClass: "bg-orange-100 text-orange-800",
    borderClass: "border-l-orange-500",
    bgClass: "bg-orange-50",
    icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
  },
  "Approve/Ineligible": {
    label: "Approve/Ineligible",
    colorClass: "bg-red-100 text-red-800",
    borderClass: "border-l-red-400",
    bgClass: "bg-red-50",
    icon: <XCircle className="w-5 h-5 text-red-500" />,
  },
  "Ineligible": {
    label: "Ineligible",
    colorClass: "bg-red-100 text-red-800",
    borderClass: "border-l-red-400",
    bgClass: "bg-red-50",
    icon: <XCircle className="w-5 h-5 text-red-500" />,
  },
  "Out of Scope": {
    label: "Out of Scope",
    colorClass: "bg-neutral-100 text-neutral-700",
    borderClass: "border-l-neutral-400",
    bgClass: "bg-neutral-50",
    icon: <XCircle className="w-5 h-5 text-neutral-500" />,
  },
  "Error": {
    label: "Error",
    colorClass: "bg-red-100 text-red-800",
    borderClass: "border-l-red-600",
    bgClass: "bg-red-50",
    icon: <XCircle className="w-5 h-5 text-red-600" />,
  },
};

const DU_FINDINGS: AUSFinding[] = [
  "Approve/Eligible",
  "Approve/Ineligible",
  "Refer",
  "Refer/Eligible",
  "Refer with Caution",
  "Out of Scope",
  "Error",
];

const LPA_FINDINGS: AUSFinding[] = [
  "Accept",
  "Caution",
  "Refer",
  "Ineligible",
  "Error",
];

const DOC_TYPE_OPTIONS = [
  "Full Documentation",
  "Alternative Documentation",
  "Reduced Documentation",
  "Bank Statement Documentation",
  "Asset Depletion",
  "No Documentation",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SystemBadge({ system }: { system: AUSSystem }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tracking-wide ${
        system === "DU"
          ? "bg-blue-700 text-white"
          : "bg-emerald-700 text-white"
      }`}
    >
      {system === "DU" ? "Fannie Mae DU" : "Freddie Mac LPA"}
    </span>
  );
}

function FindingBadge({ finding }: { finding: AUSFinding }) {
  const cfg = FINDING_CONFIG[finding];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.colorClass}`}
    >
      {finding}
    </span>
  );
}

function KeyTermsGrid({ result }: { result: AUSResult }) {
  const terms = [
    {
      label: "Max LTV",
      value: result.max_ltv_percent != null ? `${result.max_ltv_percent}%` : null,
    },
    {
      label: "Max CLTV",
      value: result.max_cltv_percent != null ? `${result.max_cltv_percent}%` : null,
    },
    {
      label: "Reserves",
      value: result.reserves_months != null ? `${result.reserves_months} mo.` : null,
    },
    {
      label: "Documentation",
      value: result.documentation_type ?? null,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
      {terms.map(({ label, value }) => (
        <div
          key={label}
          className="bg-white border border-neutral-200 rounded-lg p-3 text-center"
        >
          <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium mb-1">
            {label}
          </p>
          <p
            className={`text-sm font-bold ${
              value ? "text-neutral-900" : "text-neutral-300"
            }`}
          >
            {value ?? "—"}
          </p>
        </div>
      ))}
    </div>
  );
}

function SubmissionDetail({
  result,
  onDelete,
}: {
  result: AUSResult;
  onDelete: (id: string) => void;
}) {
  const cfg = FINDING_CONFIG[result.finding];

  return (
    <div className={`border border-neutral-200 rounded-xl overflow-hidden`}>
      {/* Finding banner */}
      <div
        className={`${cfg.bgClass} px-5 py-4 border-l-4 ${cfg.borderClass} flex items-start justify-between gap-4`}
      >
        <div className="flex items-center gap-3">
          {cfg.icon}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <SystemBadge system={result.system} />
              <FindingBadge finding={result.finding} />
            </div>
            <p className="text-xs text-neutral-500 mt-1.5">
              Casefile ID:{" "}
              <span className="font-mono font-medium text-neutral-700">
                {result.casefile_id}
              </span>{" "}
              &middot; Submission #{result.submission_number} &middot;{" "}
              {new Date(result.run_at).toLocaleString()}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(result.id)}
          className="shrink-0 p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Delete this submission"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Key terms */}
      <div className="px-5 pb-3">
        <KeyTermsGrid result={result} />
      </div>

      {/* Documentation requirements */}
      {result.doc_requirements && result.doc_requirements.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Documentation Requirements
          </p>
          <ul className="space-y-1">
            {result.doc_requirements.map((req, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations / messages */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Key Recommendations
          </p>
          <ul className="space-y-1.5">
            {result.recommendations.map((rec, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2"
              >
                <FileText className="w-3.5 h-3.5 mt-0.5 text-neutral-400 shrink-0" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Narrative summary */}
      {result.findings_summary && (
        <div className="px-5 pb-5">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Findings Summary
          </p>
          <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
            {result.findings_summary}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Log New Submission Form ──────────────────────────────────────────────────

interface LogFormProps {
  loanId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function LogSubmissionForm({ loanId, onSuccess, onCancel }: LogFormProps) {
  const queryClient = useQueryClient();

  const [system, setSystem] = useState<AUSSystem>("DU");
  const [casefileId, setCasefileId] = useState("");
  const [finding, setFinding] = useState<AUSFinding>("Approve/Eligible");
  const [maxLtv, setMaxLtv] = useState("");
  const [maxCltv, setMaxCltv] = useState("");
  const [reservesMonths, setReservesMonths] = useState("");
  const [docType, setDocType] = useState("");
  const [docRequirements, setDocRequirements] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [findingsSummary, setFindingsSummary] = useState("");
  const [runAt, setRunAt] = useState(
    () => new Date().toISOString().slice(0, 16) // datetime-local format
  );
  const [error, setError] = useState<string | null>(null);

  // Reset finding when system changes
  const handleSystemChange = (s: AUSSystem) => {
    setSystem(s);
    setFinding(s === "DU" ? "Approve/Eligible" : "Accept");
  };

  const availableFindings = system === "DU" ? DU_FINDINGS : LPA_FINDINGS;

  const mutation = useMutation({
    mutationFn: (payload: AUSResultCreatePayload) =>
      createAUSResult(loanId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aus-results", loanId] });
      onSuccess();
    },
    onError: () => setError("Failed to log AUS submission. Please try again."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!casefileId.trim()) {
      setError("Casefile ID is required.");
      return;
    }

    const docReqList = docRequirements
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const recList = recommendations
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    mutation.mutate({
      system,
      casefile_id: casefileId.trim(),
      finding,
      max_ltv_percent: maxLtv ? parseFloat(maxLtv) : null,
      max_cltv_percent: maxCltv ? parseFloat(maxCltv) : null,
      reserves_months: reservesMonths ? parseFloat(reservesMonths) : null,
      documentation_type: docType || null,
      doc_requirements: docReqList.length ? docReqList : null,
      recommendations: recList.length ? recList : null,
      findings_summary: findingsSummary.trim() || null,
      run_at: new Date(runAt).toISOString(),
    });
  };

  const inputClass =
    "w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-neutral-400";
  const labelClass = "block text-xs font-semibold text-neutral-600 mb-1";

  return (
    <form onSubmit={handleSubmit} className="border border-neutral-200 rounded-xl bg-white overflow-hidden">
      {/* Form header */}
      <div className="flex items-center justify-between px-5 py-4 bg-neutral-50 border-b border-neutral-200">
        <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary-600" />
          Log New AUS Submission
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* System + Casefile ID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>AUS System *</label>
            <div className="flex gap-2">
              {(["DU", "LPA"] as AUSSystem[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSystemChange(s)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${
                    system === s
                      ? s === "DU"
                        ? "bg-blue-700 text-white border-blue-700"
                        : "bg-emerald-700 text-white border-emerald-700"
                      : "bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400"
                  }`}
                >
                  {s === "DU" ? "Fannie Mae DU" : "Freddie Mac LPA"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="casefile-id" className={labelClass}>
              Casefile ID *
            </label>
            <input
              id="casefile-id"
              type="text"
              value={casefileId}
              onChange={(e) => setCasefileId(e.target.value)}
              placeholder={system === "DU" ? "e.g. 3827465920" : "e.g. LPA3924871"}
              className={inputClass}
              required
            />
          </div>
        </div>

        {/* Finding + Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="finding" className={labelClass}>
              Finding *
            </label>
            <select
              id="finding"
              value={finding}
              onChange={(e) => setFinding(e.target.value as AUSFinding)}
              className={inputClass}
            >
              {availableFindings.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="run-at" className={labelClass}>
              Submission Date/Time *
            </label>
            <input
              id="run-at"
              type="datetime-local"
              value={runAt}
              onChange={(e) => setRunAt(e.target.value)}
              className={inputClass}
              required
            />
          </div>
        </div>

        {/* Key terms */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="max-ltv" className={labelClass}>
              Max LTV (%)
            </label>
            <input
              id="max-ltv"
              type="number"
              step="0.001"
              min="0"
              max="100"
              value={maxLtv}
              onChange={(e) => setMaxLtv(e.target.value)}
              placeholder="e.g. 97.000"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="max-cltv" className={labelClass}>
              Max CLTV (%)
            </label>
            <input
              id="max-cltv"
              type="number"
              step="0.001"
              min="0"
              max="100"
              value={maxCltv}
              onChange={(e) => setMaxCltv(e.target.value)}
              placeholder="e.g. 105.000"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="reserves" className={labelClass}>
              Reserves (months)
            </label>
            <input
              id="reserves"
              type="number"
              step="0.5"
              min="0"
              value={reservesMonths}
              onChange={(e) => setReservesMonths(e.target.value)}
              placeholder="e.g. 2"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="doc-type" className={labelClass}>
              Documentation Type
            </label>
            <select
              id="doc-type"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className={inputClass}
            >
              <option value="">Select…</option>
              {DOC_TYPE_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Doc requirements */}
        <div>
          <label htmlFor="doc-req" className={labelClass}>
            Documentation Requirements{" "}
            <span className="text-neutral-400 font-normal">(one per line)</span>
          </label>
          <textarea
            id="doc-req"
            rows={3}
            value={docRequirements}
            onChange={(e) => setDocRequirements(e.target.value)}
            placeholder={`Two years W-2s\nMost recent 30 days pay stubs\nTwo months bank statements`}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Key recommendations */}
        <div>
          <label htmlFor="recommendations" className={labelClass}>
            Key Recommendations / Messages{" "}
            <span className="text-neutral-400 font-normal">(one per line)</span>
          </label>
          <textarea
            id="recommendations"
            rows={3}
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            placeholder={`Income documentation required per AUS\nVerify employment history gap explanation\nSelf-employment income must be supported by two years tax returns`}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Findings narrative */}
        <div>
          <label htmlFor="findings-summary" className={labelClass}>
            Findings Summary / Notes
          </label>
          <textarea
            id="findings-summary"
            rows={3}
            value={findingsSummary}
            onChange={(e) => setFindingsSummary(e.target.value)}
            placeholder="Overall narrative from the AUS findings report…"
            className={`${inputClass} resize-none`}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {/* Form actions */}
      <div className="flex items-center justify-end gap-3 px-5 py-4 bg-neutral-50 border-t border-neutral-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {mutation.isPending ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            "Log Submission"
          )}
        </button>
      </div>
    </form>
  );
}

// ─── History row ──────────────────────────────────────────────────────────────

function HistoryRow({
  result,
  isActive,
  onSelect,
}: {
  result: AUSResult;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3 border rounded-lg text-left transition-all ${
        isActive
          ? "border-primary-400 bg-primary-50 shadow-sm"
          : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
      }`}
    >
      <div className="shrink-0">
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
            isActive ? "bg-primary-600 text-white" : "bg-neutral-200 text-neutral-600"
          }`}
        >
          #{result.submission_number}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <SystemBadge system={result.system} />
          <FindingBadge finding={result.finding} />
        </div>
        <p className="text-xs text-neutral-500 mt-1 truncate">
          {new Date(result.run_at).toLocaleString()} &middot; ID:{" "}
          <span className="font-mono">{result.casefile_id}</span>
        </p>
      </div>
      <div className="shrink-0 text-neutral-400">
        {isActive ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </div>
    </button>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function AUSResultsSection({ loanId }: { loanId: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: results = [], isLoading, isError } = useQuery({
    queryKey: ["aus-results", loanId],
    queryFn: () => getAUSResults(loanId),
  });

  // Auto-select the latest submission
  const latestId = results[0]?.id ?? null;
  const activeId = selectedId ?? latestId;

  const deleteMutation = useMutation({
    mutationFn: (resultId: string) => deleteAUSResult(loanId, resultId),
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["aus-results", loanId] });
      if (selectedId === deletedId) setSelectedId(null);
    },
  });

  const activeResult = results.find((r) => r.id === activeId) ?? null;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-40">
        <div className="text-center">
          <div className="w-7 h-7 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-neutral-500">Loading AUS submissions…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center">
          <p className="text-red-600 font-medium">Failed to load AUS results.</p>
          <p className="text-sm text-neutral-500 mt-1">Please refresh and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-neutral-900">AUS Results</h2>
          {results.length > 0 && (
            <span className="bg-neutral-200 text-neutral-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {results.length} submission{results.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            Log Submission
          </button>
        )}
      </div>

      {/* Log form */}
      {showForm && (
        <div className="mb-6">
          <LogSubmissionForm
            loanId={loanId}
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && !showForm && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-4">
            <BarChart2 className="w-7 h-7 text-primary-600" />
          </div>
          <p className="text-neutral-700 font-medium">No AUS submissions yet</p>
          <p className="text-sm text-neutral-400 mt-1 mb-5 max-w-sm">
            Log a Desktop Underwriter (DU) or Loan Product Advisor (LPA) result
            to track the automated underwriting findings for this loan.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Log First Submission
          </button>
        </div>
      )}

      {/* Submission history + detail */}
      {results.length > 0 && (
        <div className="space-y-3">
          {/* Most-recent detail (auto-expanded) always shown at top */}
          {activeResult && (
            <SubmissionDetail
              result={activeResult}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          )}

          {/* History list (for prior runs) */}
          {results.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2 mt-4">
                Submission History
              </p>
              <div className="space-y-2">
                {results.map((r) => (
                  <div key={r.id}>
                    <HistoryRow
                      result={r}
                      isActive={r.id === activeId}
                      onSelect={() =>
                        setSelectedId(r.id === activeId ? null : r.id)
                      }
                    />
                    {r.id === activeId && r.id !== results[0]?.id && (
                      <div className="mt-2">
                        <SubmissionDetail
                          result={r}
                          onDelete={(id) => deleteMutation.mutate(id)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compliance note */}
      <div className="mt-6 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
        <p className="text-xs text-neutral-500">
          <strong className="text-neutral-700">AUS Compliance Note:</strong>{" "}
          All AUS findings must be interpreted by a qualified underwriter.
          Approve/Eligible and Accept findings are subject to property and
          eligibility requirements. Retain original casefile reports per investor
          guidelines.
        </p>
      </div>
    </div>
  );
}

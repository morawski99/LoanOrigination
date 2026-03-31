import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/design-system/components";
import { createUnderwritingDecision } from "@/services/api";
import type {
  UnderwritingDecisionType,
  ConditionCreatePayload,
} from "@/types/loan";

interface DecisionDialogProps {
  loanId: string;
  loanNumber: string;
  onClose: () => void;
}

const DECISION_OPTIONS: {
  value: UnderwritingDecisionType;
  label: string;
  description: string;
  icon: typeof CheckCircle;
  color: string;
  bg: string;
}[] = [
  {
    value: "Approved",
    label: "Approve",
    description: "Loan meets all guidelines — clear to proceed",
    icon: CheckCircle,
    color: "text-green-700",
    bg: "bg-green-50 border-green-300",
  },
  {
    value: "ConditionalApproval",
    label: "Conditional Approval",
    description: "Approved subject to conditions being satisfied",
    icon: ShieldCheck,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-300",
  },
  {
    value: "Suspended",
    label: "Suspend",
    description: "Cannot decide — additional information required",
    icon: AlertTriangle,
    color: "text-yellow-700",
    bg: "bg-yellow-50 border-yellow-300",
  },
  {
    value: "Declined",
    label: "Decline",
    description: "Loan does not meet guidelines",
    icon: XCircle,
    color: "text-red-700",
    bg: "bg-red-50 border-red-300",
  },
];

interface ConditionRow {
  description: string;
  due_date: string;
}

export default function DecisionDialog({
  loanId,
  loanNumber,
  onClose,
}: DecisionDialogProps) {
  const queryClient = useQueryClient();
  const [decisionType, setDecisionType] =
    useState<UnderwritingDecisionType | null>(null);
  const [notes, setNotes] = useState("");
  const [conditions, setConditions] = useState<ConditionRow[]>([]);

  const showConditions =
    decisionType === "ConditionalApproval" || decisionType === "Suspended";

  const mutation = useMutation({
    mutationFn: () => {
      if (!decisionType) throw new Error("Select a decision");
      const condPayloads: ConditionCreatePayload[] | undefined = showConditions
        ? conditions
            .filter((c) => c.description.trim())
            .map((c) => ({
              condition_type: "PTA" as const,
              description: c.description.trim(),
              due_date: c.due_date || undefined,
            }))
        : undefined;

      return createUnderwritingDecision(loanId, {
        decision_type: decisionType,
        notes: notes.trim() || undefined,
        conditions:
          condPayloads && condPayloads.length > 0 ? condPayloads : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["underwriting-queue"] });
      queryClient.invalidateQueries({ queryKey: ["underwriting-stats"] });
      queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
      onClose();
    },
  });

  const addCondition = () =>
    setConditions((prev) => [...prev, { description: "", due_date: "" }]);

  const removeCondition = (idx: number) =>
    setConditions((prev) => prev.filter((_, i) => i !== idx));

  const updateCondition = (
    idx: number,
    field: keyof ConditionRow,
    value: string
  ) =>
    setConditions((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Underwriting Decision
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Loan {loanNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Decision type selector */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Decision <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DECISION_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = decisionType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDecisionType(opt.value)}
                    className={`flex items-start gap-2 p-3 rounded-lg border-2 text-left transition-all ${
                      selected
                        ? `${opt.bg} ring-1 ring-offset-0`
                        : "border-neutral-200 bg-white hover:border-neutral-300"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        selected ? opt.color : "text-neutral-400"
                      }`}
                    />
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          selected ? opt.color : "text-neutral-800"
                        }`}
                      >
                        {opt.label}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="decision-notes"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Notes
            </label>
            <textarea
              id="decision-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Underwriting rationale, stipulations, or comments..."
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Conditions (conditional approval / suspend) */}
          {showConditions && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-neutral-700">
                  PTA Conditions
                </label>
                <button
                  type="button"
                  onClick={addCondition}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Condition
                </button>
              </div>

              {conditions.length === 0 && (
                <p className="text-xs text-neutral-400 italic">
                  No conditions added yet. Click "Add Condition" to attach PTA
                  stipulations.
                </p>
              )}

              <div className="space-y-2">
                {conditions.map((cond, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-3 border border-neutral-200 rounded-lg bg-neutral-50"
                  >
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={cond.description}
                        onChange={(e) =>
                          updateCondition(idx, "description", e.target.value)
                        }
                        placeholder="Condition description..."
                        className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <input
                        type="date"
                        value={cond.due_date}
                        onChange={(e) =>
                          updateCondition(idx, "due_date", e.target.value)
                        }
                        className="rounded border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCondition(idx)}
                      className="text-neutral-400 hover:text-red-600 p-1 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {mutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Failed to record decision. Please try again."}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!decisionType || mutation.isPending}
            isLoading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Record Decision
          </Button>
        </div>
      </div>
    </div>
  );
}

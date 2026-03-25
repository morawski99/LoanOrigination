import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileSignature,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Send,
  RefreshCw,
  DollarSign,
  Trash2,
} from "lucide-react";
import type { Loan } from "@/types/loan";
import type {
  LoanEstimate,
  LoanEstimateListItem,
  LoanEstimateFeeCreate,
  TRIDStatus,
} from "@/types/loan_estimate";
import {
  LEStatus,
  RespaSection,
  PaidBy,
  RESPA_SECTION_LABELS,
  SECTION_TOLERANCE_LABELS,
  DEFAULT_FEES,
} from "@/types/loan_estimate";
import {
  getLoanEstimates,
  getLoanEstimate,
  createLoanEstimate,
  replaceLEFees,
  issueLoanEstimate,
  getTRIDStatus,
} from "@/services/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(amount: number | undefined | null): string {
  if (amount == null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function fmtPct(rate: number | undefined | null): string {
  if (rate == null) return "—";
  return `${Number(rate).toFixed(3)}%`;
}

function statusColor(s: LEStatus): string {
  switch (s) {
    case LEStatus.DRAFT:
      return "bg-yellow-100 text-yellow-800";
    case LEStatus.ISSUED:
      return "bg-green-100 text-green-800";
    case LEStatus.REVISED:
      return "bg-blue-100 text-blue-800";
    case LEStatus.SUPERSEDED:
      return "bg-neutral-200 text-neutral-600";
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TRIDStatusBar({ loanId }: { loanId: string }) {
  const { data: trid } = useQuery<TRIDStatus>({
    queryKey: ["trid-status", loanId],
    queryFn: () => getTRIDStatus(loanId),
  });

  if (!trid) return null;

  const urgent =
    trid.days_until_deadline != null && trid.days_until_deadline <= 1;
  const warning =
    trid.days_until_deadline != null &&
    trid.days_until_deadline > 1 &&
    trid.days_until_deadline <= 3;

  return (
    <div
      className={`rounded-lg p-3 text-sm flex items-center gap-3 ${
        trid.le_issued
          ? "bg-green-50 border border-green-200"
          : urgent
          ? "bg-red-50 border border-red-300"
          : warning
          ? "bg-yellow-50 border border-yellow-200"
          : "bg-blue-50 border border-blue-200"
      }`}
    >
      {trid.le_issued ? (
        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
      ) : urgent ? (
        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
      ) : (
        <Clock className="w-4 h-4 text-blue-600 shrink-0" />
      )}
      <div className="flex-1">
        {trid.le_issued ? (
          <span className="text-green-800">
            LE issued on{" "}
            {trid.le_issued_date
              ? new Date(trid.le_issued_date).toLocaleDateString()
              : "—"}
            {trid.earliest_closing_date && (
              <>
                {" "}
                &middot; Earliest closing:{" "}
                {new Date(trid.earliest_closing_date).toLocaleDateString()}
              </>
            )}
          </span>
        ) : trid.le_deadline ? (
          <span
            className={urgent ? "text-red-800 font-semibold" : "text-blue-800"}
          >
            LE deadline:{" "}
            {new Date(trid.le_deadline).toLocaleDateString()}
            {trid.days_until_deadline != null && (
              <> ({trid.days_until_deadline} day{trid.days_until_deadline !== 1 ? "s" : ""} remaining)</>
            )}
          </span>
        ) : (
          <span className="text-neutral-600">
            Set application received date to calculate TRID deadlines
          </span>
        )}
      </div>
      {trid.latest_le_version > 0 && (
        <span className="text-xs text-neutral-500 shrink-0">
          v{trid.latest_le_version}
        </span>
      )}
    </div>
  );
}

function LEVersionList({
  items,
  selectedId,
  onSelect,
}: {
  items: LoanEstimateListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {items.map((le) => (
        <button
          key={le.id}
          onClick={() => onSelect(le.id)}
          className={`w-full text-left rounded-lg border p-3 transition-colors text-sm ${
            selectedId === le.id
              ? "border-primary-400 bg-primary-50"
              : "border-neutral-200 bg-white hover:border-neutral-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-neutral-900">
              Version {le.version_number}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(
                le.status
              )}`}
            >
              {le.status}
            </span>
          </div>
          <div className="text-xs text-neutral-500 space-y-0.5">
            {le.note_rate_percent != null && (
              <p>Rate: {fmtPct(le.note_rate_percent)}</p>
            )}
            {le.total_monthly_payment != null && (
              <p>Payment: {fmt(le.total_monthly_payment)}/mo</p>
            )}
            {le.total_closing_costs != null && (
              <p>Closing Costs: {fmt(le.total_closing_costs)}</p>
            )}
            <p>Created {new Date(le.created_at).toLocaleDateString()}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function ProjectedPayments({ le }: { le: LoanEstimate }) {
  return (
    <div className="card p-4">
      <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-3">
        Projected Payments
      </h4>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-neutral-500">Principal & Interest</dt>
          <dd className="font-medium">{fmt(le.monthly_principal_interest)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-500">Mortgage Insurance</dt>
          <dd className="font-medium">{fmt(le.monthly_mortgage_insurance)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-500">Est. Escrow</dt>
          <dd className="font-medium">{fmt(le.monthly_escrow_amount)}</dd>
        </div>
        <div className="flex justify-between border-t border-neutral-200 pt-2">
          <dt className="font-semibold text-neutral-900">
            Total Monthly Payment
          </dt>
          <dd className="font-bold text-primary-700">
            {fmt(le.total_monthly_payment)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function ClosingCosts({ le }: { le: LoanEstimate }) {
  return (
    <div className="card p-4">
      <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-3">
        Closing Costs
      </h4>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-neutral-500">Loan Costs (A+B+C)</dt>
          <dd className="font-medium">{fmt(le.total_loan_costs)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-500">Other Costs (E+F+G+H)</dt>
          <dd className="font-medium">{fmt(le.total_other_costs)}</dd>
        </div>
        <div className="flex justify-between text-green-700">
          <dt className="text-neutral-500">Lender Credits</dt>
          <dd className="font-medium">
            {le.lender_credits > 0
              ? `(${fmt(le.lender_credits)})`
              : fmt(le.lender_credits)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-neutral-200 pt-2">
          <dt className="font-semibold text-neutral-900">
            Total Closing Costs
          </dt>
          <dd className="font-bold text-primary-700">
            {fmt(le.total_closing_costs)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function CashToClose({ le }: { le: LoanEstimate }) {
  return (
    <div className="card p-4">
      <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-3">
        Cash to Close
      </h4>
      <dl className="space-y-2 text-sm">
        {le.purchase_price != null && (
          <div className="flex justify-between">
            <dt className="text-neutral-500">Purchase Price</dt>
            <dd className="font-medium">{fmt(le.purchase_price)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-neutral-500">Loan Amount</dt>
          <dd className="font-medium">{fmt(le.loan_amount)}</dd>
        </div>
        {le.down_payment != null && (
          <div className="flex justify-between">
            <dt className="text-neutral-500">Down Payment</dt>
            <dd className="font-medium">{fmt(le.down_payment)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-neutral-500">Total Closing Costs</dt>
          <dd className="font-medium">{fmt(le.total_closing_costs)}</dd>
        </div>
        {le.deposit > 0 && (
          <div className="flex justify-between text-green-700">
            <dt className="text-neutral-500">Deposit</dt>
            <dd className="font-medium">({fmt(le.deposit)})</dd>
          </div>
        )}
        {le.seller_credits > 0 && (
          <div className="flex justify-between text-green-700">
            <dt className="text-neutral-500">Seller Credits</dt>
            <dd className="font-medium">({fmt(le.seller_credits)})</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-neutral-200 pt-2">
          <dt className="font-semibold text-neutral-900">
            Estimated Cash to Close
          </dt>
          <dd className="font-bold text-primary-700">
            {fmt(le.cash_to_close)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function LoanTermsSummary({ le }: { le: LoanEstimate }) {
  const termYears = le.loan_term_months / 12;
  return (
    <div className="card p-4">
      <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-3">
        Loan Terms
      </h4>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-neutral-500">Loan Amount</dt>
          <dd className="font-medium">{fmt(le.loan_amount)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-500">Interest Rate</dt>
          <dd className="font-medium">{fmtPct(le.note_rate_percent)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-500">APR</dt>
          <dd className="font-medium">{fmtPct(le.apr_percent)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-500">Loan Term</dt>
          <dd className="font-medium">{termYears} years</dd>
        </div>
      </dl>
    </div>
  );
}

function FeeSection({
  section,
  fees,
}: {
  section: RespaSection;
  fees: LoanEstimate["fees"];
}) {
  const [open, setOpen] = useState(true);
  const sectionFees = fees.filter((f) => f.respa_section === section);
  const total = sectionFees.reduce((s, f) => s + f.fee_amount, 0);

  return (
    <div className="border border-neutral-200 rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
          )}
          <span className="text-sm font-semibold text-neutral-800">
            {RESPA_SECTION_LABELS[section]}
          </span>
          <span className="text-xs text-neutral-400">
            {SECTION_TOLERANCE_LABELS[section]}
          </span>
        </div>
        <span className="text-sm font-semibold text-neutral-900">
          {fmt(total)}
        </span>
      </button>
      {open && sectionFees.length > 0 && (
        <div className="border-t border-neutral-100 px-3 pb-3">
          {sectionFees.map((fee) => (
            <div
              key={fee.id}
              className="flex items-center justify-between py-1.5 text-sm"
            >
              <div className="flex-1">
                <span className="text-neutral-700">{fee.fee_name}</span>
                {fee.paid_to && (
                  <span className="text-xs text-neutral-400 ml-2">
                    to {fee.paid_to}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {fee.paid_by !== PaidBy.BORROWER && (
                  <span className="text-xs text-neutral-400">
                    ({fee.paid_by})
                  </span>
                )}
                <span className="font-medium text-neutral-900 w-24 text-right">
                  {fmt(fee.fee_amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && sectionFees.length === 0 && (
        <p className="text-xs text-neutral-400 px-3 pb-3 pt-1">
          No fees in this section
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fee Editor (for draft LE)
// ---------------------------------------------------------------------------

interface FeeRow {
  respa_section: RespaSection;
  fee_name: string;
  fee_amount: string;
  paid_by: PaidBy;
  paid_to: string;
  is_finance_charge: boolean;
}

function FeeEditor({
  loanId,
  leId,
  initialFees,
  onSaved,
}: {
  loanId: string;
  leId: string;
  initialFees: LoanEstimate["fees"];
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();

  const [rows, setRows] = useState<FeeRow[]>(() =>
    initialFees.length > 0
      ? initialFees.map((f) => ({
          respa_section: f.respa_section,
          fee_name: f.fee_name,
          fee_amount: String(f.fee_amount),
          paid_by: f.paid_by,
          paid_to: f.paid_to || "",
          is_finance_charge: f.is_finance_charge,
        }))
      : DEFAULT_FEES.map((f) => ({
          respa_section: f.respa_section,
          fee_name: f.fee_name,
          fee_amount: String(f.fee_amount),
          paid_by: PaidBy.BORROWER,
          paid_to: f.paid_to || "",
          is_finance_charge: f.is_finance_charge,
        }))
  );

  const saveMutation = useMutation({
    mutationFn: (fees: LoanEstimateFeeCreate[]) =>
      replaceLEFees(loanId, leId, fees),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan-estimate", loanId, leId] });
      queryClient.invalidateQueries({ queryKey: ["loan-estimates", loanId] });
      onSaved();
    },
  });

  const updateRow = (idx: number, field: keyof FeeRow, value: string | boolean) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addRow = (section: RespaSection) => {
    setRows((prev) => [
      ...prev,
      {
        respa_section: section,
        fee_name: "",
        fee_amount: "0",
        paid_by: PaidBy.BORROWER,
        paid_to: "",
        is_finance_charge: true,
      },
    ]);
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const fees: LoanEstimateFeeCreate[] = rows
      .filter((r) => r.fee_name.trim())
      .map((r, i) => ({
        respa_section: r.respa_section,
        fee_name: r.fee_name,
        fee_amount: parseFloat(r.fee_amount) || 0,
        paid_by: r.paid_by,
        paid_to: r.paid_to || undefined,
        is_finance_charge: r.is_finance_charge,
        sort_order: i,
      }));
    saveMutation.mutate(fees);
  };

  const sections: RespaSection[] = [
    RespaSection.A,
    RespaSection.B,
    RespaSection.C,
    RespaSection.E,
    RespaSection.F,
    RespaSection.G,
    RespaSection.H,
  ];

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const sectionRows = rows
          .map((r, i) => ({ ...r, _idx: i }))
          .filter((r) => r.respa_section === section);
        const sectionTotal = sectionRows.reduce(
          (s, r) => s + (parseFloat(r.fee_amount) || 0),
          0
        );

        return (
          <div key={section} className="border border-neutral-200 rounded-lg">
            <div className="flex items-center justify-between bg-neutral-50 rounded-t-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-neutral-800">
                  {RESPA_SECTION_LABELS[section]}
                </span>
                <span className="text-xs text-neutral-400">
                  {SECTION_TOLERANCE_LABELS[section]}
                </span>
              </div>
              <span className="text-sm font-semibold text-neutral-700">
                {fmt(sectionTotal)}
              </span>
            </div>
            <div className="px-3 pb-2 pt-1 space-y-1.5">
              {sectionRows.map((row) => (
                <div key={row._idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={row.fee_name}
                    onChange={(e) =>
                      updateRow(row._idx, "fee_name", e.target.value)
                    }
                    placeholder="Fee name"
                    className="flex-1 text-sm border border-neutral-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-400"
                  />
                  <input
                    type="text"
                    value={row.paid_to}
                    onChange={(e) =>
                      updateRow(row._idx, "paid_to", e.target.value)
                    }
                    placeholder="Paid to"
                    className="w-32 text-sm border border-neutral-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-400"
                  />
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.fee_amount}
                      onChange={(e) =>
                        updateRow(row._idx, "fee_amount", e.target.value)
                      }
                      className="w-28 text-sm border border-neutral-200 rounded pl-5 pr-2 py-1.5 text-right focus:outline-none focus:ring-1 focus:ring-primary-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(row._idx)}
                    className="p-1 text-neutral-300 hover:text-red-500 transition-colors"
                    title="Remove fee"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addRow(section)}
                className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1 py-1"
              >
                <Plus className="w-3 h-3" /> Add fee
              </button>
            </div>
          </div>
        );
      })}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${saveMutation.isPending ? "animate-spin" : ""}`}
          />
          {saveMutation.isPending ? "Saving..." : "Save & Recalculate"}
        </button>
      </div>

      {saveMutation.isError && (
        <p className="text-sm text-red-600">
          Failed to save fees. Please try again.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create LE Modal
// ---------------------------------------------------------------------------

function CreateLEForm({
  loanId,
  loan,
  onCreated,
  onCancel,
}: {
  loanId: string;
  loan: Loan;
  onCreated: (le: LoanEstimate) => void;
  onCancel: () => void;
}) {
  const [termMonths, setTermMonths] = useState(360);
  const [rate, setRate] = useState(loan.note_rate_percent?.toString() || "");
  const [mi, setMi] = useState("0");
  const [escrow, setEscrow] = useState("0");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [deposit, setDeposit] = useState("0");
  const [sellerCredits, setSellerCredits] = useState("0");
  const [lenderCredits, setLenderCredits] = useState("0");

  const mutation = useMutation({
    mutationFn: () =>
      createLoanEstimate(loanId, {
        loan_term_months: termMonths,
        note_rate_percent: rate ? parseFloat(rate) : undefined,
        monthly_mortgage_insurance: parseFloat(mi) || 0,
        monthly_escrow_amount: parseFloat(escrow) || 0,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
        deposit: parseFloat(deposit) || 0,
        seller_credits: parseFloat(sellerCredits) || 0,
        lender_credits: parseFloat(lenderCredits) || 0,
        fees: DEFAULT_FEES.map((f, i) => ({
          respa_section: f.respa_section,
          fee_name: f.fee_name,
          fee_amount: f.fee_amount,
          paid_by: PaidBy.BORROWER,
          paid_to: f.paid_to,
          is_finance_charge: f.is_finance_charge,
          sort_order: i,
        })),
      }),
    onSuccess: (le) => onCreated(le),
  });

  return (
    <div className="card p-5">
      <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
        <FileSignature className="w-5 h-5 text-primary-600" />
        Prepare New Loan Estimate
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Loan Term
          </label>
          <select
            value={termMonths}
            onChange={(e) => setTermMonths(Number(e.target.value))}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value={360}>30 Year Fixed</option>
            <option value={240}>20 Year Fixed</option>
            <option value={180}>15 Year Fixed</option>
            <option value={120}>10 Year Fixed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Interest Rate (%)
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            max="30"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="e.g. 6.875"
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Monthly MI ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={mi}
            onChange={(e) => setMi(e.target.value)}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Monthly Escrow ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={escrow}
            onChange={(e) => setEscrow(e.target.value)}
            placeholder="Taxes + Insurance"
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Purchase Price ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            placeholder="Leave blank for refinance"
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Earnest Money Deposit ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Seller Credits ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={sellerCredits}
            onChange={(e) => setSellerCredits(e.target.value)}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Lender Credits ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={lenderCredits}
            onChange={(e) => setLenderCredits(e.target.value)}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
      </div>

      <p className="text-xs text-neutral-400 mb-4">
        Default RESPA fee schedule will be applied. You can edit individual fees
        after creation.
      </p>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !rate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? "Creating..." : "Create Draft LE"}
        </button>
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-600 mt-2">
          Failed to create Loan Estimate. Please check all fields.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LE Detail View
// ---------------------------------------------------------------------------

function LEDetail({
  loanId,
  leId,
}: {
  loanId: string;
  leId: string;
}) {
  const queryClient = useQueryClient();
  const [editingFees, setEditingFees] = useState(false);

  const { data: le, isLoading } = useQuery<LoanEstimate>({
    queryKey: ["loan-estimate", loanId, leId],
    queryFn: () => getLoanEstimate(loanId, leId),
  });

  const issueMutation = useMutation({
    mutationFn: () =>
      issueLoanEstimate(loanId, leId, {
        issued_date: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan-estimate", loanId, leId] });
      queryClient.invalidateQueries({ queryKey: ["loan-estimates", loanId] });
      queryClient.invalidateQueries({ queryKey: ["trid-status", loanId] });
    },
  });

  if (isLoading || !le) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isDraft = le.status === LEStatus.DRAFT;
  const sections: RespaSection[] = [
    RespaSection.A,
    RespaSection.B,
    RespaSection.C,
    RespaSection.E,
    RespaSection.F,
    RespaSection.G,
    RespaSection.H,
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-neutral-900">
            Loan Estimate v{le.version_number}
          </h3>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(
              le.status
            )}`}
          >
            {le.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isDraft && (
            <>
              <button
                type="button"
                onClick={() => setEditingFees(!editingFees)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <DollarSign className="w-3.5 h-3.5" />
                {editingFees ? "View Summary" : "Edit Fees"}
              </button>
              <button
                type="button"
                onClick={() => issueMutation.mutate()}
                disabled={issueMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {issueMutation.isPending ? "Issuing..." : "Issue to Borrower"}
              </button>
            </>
          )}
        </div>
      </div>

      {le.coc_reason && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <span className="font-medium text-blue-800">Revised LE</span>
          <span className="text-blue-700">
            {" "}
            — {le.revision_reason}
          </span>
        </div>
      )}

      {isDraft && editingFees ? (
        <FeeEditor
          loanId={loanId}
          leId={leId}
          initialFees={le.fees}
          onSaved={() => setEditingFees(false)}
        />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LoanTermsSummary le={le} />
            <ProjectedPayments le={le} />
            <ClosingCosts le={le} />
            <CashToClose le={le} />
          </div>

          {/* Fee breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-2">
              Fee Breakdown by RESPA Section
            </h4>
            <div className="space-y-2">
              {sections.map((s) => (
                <FeeSection key={s} section={s} fees={le.fees} />
              ))}
            </div>
          </div>
        </>
      )}

      {issueMutation.isError && (
        <p className="text-sm text-red-600">
          Failed to issue Loan Estimate. Please try again.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

export default function DisclosuresSection({ loan }: { loan: Loan }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedLEId, setSelectedLEId] = useState<string | null>(null);

  const { data: leList = [], isLoading } = useQuery<LoanEstimateListItem[]>({
    queryKey: ["loan-estimates", loan.id],
    queryFn: () => getLoanEstimates(loan.id),
  });

  const handleCreated = (le: LoanEstimate) => {
    setShowCreate(false);
    setSelectedLEId(le.id);
    queryClient.invalidateQueries({ queryKey: ["loan-estimates", loan.id] });
    queryClient.invalidateQueries({ queryKey: ["trid-status", loan.id] });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
          <FileSignature className="w-5 h-5 text-primary-600" />
          Disclosures
        </h2>
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Prepare Loan Estimate
          </button>
        )}
      </div>

      {/* TRID Status */}
      <div className="mb-4">
        <TRIDStatusBar loanId={loan.id} />
      </div>

      {showCreate && (
        <div className="mb-6">
          <CreateLEForm
            loanId={loan.id}
            loan={loan}
            onCreated={handleCreated}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leList.length === 0 && !showCreate ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-4">
            <FileSignature className="w-7 h-7 text-primary-600" />
          </div>
          <p className="text-neutral-600 font-medium">
            No Loan Estimates prepared yet
          </p>
          <p className="text-sm text-neutral-400 mt-1 max-w-md">
            Click "Prepare Loan Estimate" to create a draft LE with RESPA fee
            sections, projected payments, and TRID-compliant closing cost
            disclosures.
          </p>
        </div>
      ) : leList.length > 0 ? (
        <div className="flex gap-6">
          {/* Version sidebar */}
          <div className="w-56 shrink-0">
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
              LE Versions
            </h4>
            <LEVersionList
              items={leList}
              selectedId={selectedLEId}
              onSelect={setSelectedLEId}
            />
          </div>

          {/* Detail area */}
          <div className="flex-1 min-w-0">
            {selectedLEId ? (
              <LEDetail loanId={loan.id} leId={selectedLEId} />
            ) : (
              <div className="card p-12 flex flex-col items-center justify-center text-center">
                <p className="text-neutral-500 text-sm">
                  Select a Loan Estimate version from the list to view details.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

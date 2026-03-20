import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getLoan, updateLoan } from "@/services/api";
import {
  Select,
  RadioGroup,
  CurrencyInput,
  Input,
  FormSection,
} from "@/design-system/components";
import type { UseURLAFormReturn } from "../hooks/useURLAForm";

interface Section4Props {
  loanId: string;
  formHook: UseURLAFormReturn;
}

const REFINANCE_PURPOSE_OPTIONS = [
  { value: "LowerRatePayment", label: "Lower rate / payment" },
  { value: "ShorterTerm", label: "Shorter term" },
  { value: "CashOutHomeImprovement", label: "Cash out — home improvement" },
  { value: "CashOutDebtConsolidation", label: "Cash out — debt consolidation" },
  { value: "CashOutOther", label: "Cash out — other" },
  { value: "Other", label: "Other" },
];

const TITLE_MANNER_OPTIONS = [
  { value: "SoleOwnership", label: "Sole Ownership" },
  { value: "JointTenants", label: "Joint Tenants" },
  { value: "TenantsInCommon", label: "Tenants in Common" },
  { value: "TenantsByEntirety", label: "Tenants by Entirety" },
  { value: "Other", label: "Other" },
];

const ESTATE_OPTIONS = [
  { value: "FeeSimple", label: "Fee Simple" },
  {
    value: "Leasehold",
    label: "Leasehold",
    description: "Subject to a land lease",
  },
];

const DOWN_PAYMENT_SOURCE_OPTIONS = [
  { value: "CheckingSavings", label: "Checking / Savings" },
  { value: "EquityPendingSale", label: "Equity on Pending Sale" },
  { value: "GiftFunds", label: "Gift Funds" },
  { value: "Retirement401k", label: "401k / Retirement" },
  { value: "BridgeLoan", label: "Bridge Loan" },
  { value: "Other", label: "Other" },
];

export const Section4LoanProperty: React.FC<Section4Props> = ({
  loanId,
  formHook,
}) => {
  const { triggerAutoSave } = formHook;

  const { data: loan } = useQuery({
    queryKey: ["loan", loanId],
    queryFn: () => getLoan(loanId),
    enabled: Boolean(loanId),
  });

  const [purchasePrice, setPurchasePrice] = React.useState("");
  const [improvements, setImprovements] = React.useState("");
  const [refinancePurpose, setRefinancePurpose] = React.useState("");
  const [titleName, setTitleName] = React.useState("");
  const [titleManner, setTitleManner] = React.useState("");
  const [estateType, setEstateType] = React.useState("FeeSimple");
  const [leaseholdExpiry, setLeaseholdExpiry] = React.useState("");
  const [downPaymentSource, setDownPaymentSource] = React.useState("");
  const [hoaPayment, setHoaPayment] = React.useState("");

  const isRefinance =
    loan?.loan_purpose_type === "Refinance" ||
    loan?.loan_purpose_type === "CashOutRefinance";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-neutral-900">
          Section 4: Loan and Property Information
        </h2>
        <p className="text-sm text-neutral-600 mt-1">
          Information about the loan and subject property.
        </p>
      </div>

      {/* Read-only loan data from origination */}
      <FormSection title="Loan Details (from application)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          {[
            { label: "Loan Number", value: loan?.loan_number ?? "—" },
            { label: "Loan Amount", value: loan ? `$${Number(loan.loan_amount).toLocaleString()}` : "—" },
            { label: "Loan Purpose", value: loan?.loan_purpose_type ?? "—" },
            { label: "Loan Type", value: loan?.loan_type ?? "—" },
            { label: "Property Address", value: loan?.property_address_line ?? "—" },
            {
              label: "City, State ZIP",
              value: loan
                ? `${loan.property_city}, ${loan.property_state} ${loan.property_zip}`
                : "—",
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-neutral-500 font-medium">{label}</p>
              <p className="text-sm text-neutral-900 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-neutral-400 mt-2">
          To update these fields, return to the loan overview.
        </p>
      </FormSection>

      {/* Editable fields */}
      <FormSection title="Purchase / Valuation">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CurrencyInput
            label={isRefinance ? "Appraised Value" : "Purchase Price"}
            name="purchase_price"
            value={purchasePrice}
            onChange={(val) => {
              setPurchasePrice(val);
              triggerAutoSave(() =>
                updateLoan(loanId, { loan_amount: parseFloat(val) })
              );
            }}
          />
          {isRefinance && (
            <CurrencyInput
              label="Improvements / Repairs Amount"
              name="improvements"
              value={improvements}
              onChange={setImprovements}
              helperText="Cost of planned improvements"
            />
          )}
        </div>

        {isRefinance && (
          <Select
            label="Refinance Purpose"
            name="refinance_purpose"
            value={refinancePurpose}
            onChange={setRefinancePurpose}
            options={REFINANCE_PURPOSE_OPTIONS}
            placeholder="Select purpose..."
          />
        )}
      </FormSection>

      <FormSection title="Title Information">
        <Input
          label="Title will be held in what name(s)"
          name="title_name"
          value={titleName}
          onChange={(e) => setTitleName(e.target.value)}
          helperText="Full legal name(s) as they should appear on title"
        />
        <Select
          label="Manner in which title will be held"
          name="title_manner"
          value={titleManner}
          onChange={setTitleManner}
          options={TITLE_MANNER_OPTIONS}
          placeholder="Select..."
        />
        <RadioGroup
          label="Estate will be held in"
          name="estate_type"
          value={estateType}
          onChange={setEstateType}
          options={ESTATE_OPTIONS}
          layout="horizontal"
        />
        {estateType === "Leasehold" && (
          <div className="max-w-xs">
            <Input
              label="Leasehold Expiration Date"
              name="leasehold_expiry"
              type="date"
              value={leaseholdExpiry}
              onChange={(e) => setLeaseholdExpiry(e.target.value)}
              required
            />
          </div>
        )}
      </FormSection>

      <FormSection title="Down Payment & Closing Costs">
        <Select
          label="Source of Down Payment"
          name="down_payment_source"
          value={downPaymentSource}
          onChange={setDownPaymentSource}
          options={DOWN_PAYMENT_SOURCE_OPTIONS}
          placeholder="Select source..."
        />
        <div className="max-w-xs">
          <CurrencyInput
            label="HOA Monthly Payment"
            name="hoa_payment"
            value={hoaPayment}
            onChange={setHoaPayment}
            helperText="Leave blank if not applicable"
          />
        </div>
      </FormSection>
    </div>
  );
};

export default Section4LoanProperty;

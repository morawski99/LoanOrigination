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

  // Initialize from mismo_data if present
  const mismo = (loan?.mismo_data ?? {}) as Record<string, string>;

  const [purchasePrice, setPurchasePrice] = React.useState(mismo.purchase_price ?? "");
  const [improvements, setImprovements] = React.useState(mismo.improvements ?? "");
  const [refinancePurpose, setRefinancePurpose] = React.useState(mismo.refinance_purpose ?? "");
  const [titleName, setTitleName] = React.useState(mismo.title_name ?? "");
  const [titleManner, setTitleManner] = React.useState(mismo.title_manner ?? "");
  const [estateType, setEstateType] = React.useState(mismo.estate_type ?? "FeeSimple");
  const [leaseholdExpiry, setLeaseholdExpiry] = React.useState(mismo.leasehold_expiry ?? "");
  const [downPaymentSource, setDownPaymentSource] = React.useState(mismo.down_payment_source ?? "");
  const [hoaPayment, setHoaPayment] = React.useState(mismo.hoa_payment ?? "");

  // Sync when loan data loads for the first time
  const [initialised, setInitialised] = React.useState(false);
  React.useEffect(() => {
    if (loan && !initialised) {
      const m = (loan.mismo_data ?? {}) as Record<string, string>;
      setPurchasePrice(m.purchase_price ?? "");
      setImprovements(m.improvements ?? "");
      setRefinancePurpose(m.refinance_purpose ?? "");
      setTitleName(m.title_name ?? "");
      setTitleManner(m.title_manner ?? "");
      setEstateType(m.estate_type ?? "FeeSimple");
      setLeaseholdExpiry(m.leasehold_expiry ?? "");
      setDownPaymentSource(m.down_payment_source ?? "");
      setHoaPayment(m.hoa_payment ?? "");
      setInitialised(true);
    }
  }, [loan, initialised]);

  const saveMismoField = (key: string, value: string) => {
    const current = (loan?.mismo_data ?? {}) as Record<string, string>;
    triggerAutoSave(() =>
      updateLoan(loanId, { mismo_data: { ...current, [key]: value } })
    );
  };

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
              saveMismoField("purchase_price", val);
            }}
          />
          {isRefinance && (
            <CurrencyInput
              label="Improvements / Repairs Amount"
              name="improvements"
              value={improvements}
              onChange={(val) => {
                setImprovements(val);
                saveMismoField("improvements", val);
              }}
              helperText="Cost of planned improvements"
            />
          )}
        </div>

        {isRefinance && (
          <Select
            label="Refinance Purpose"
            name="refinance_purpose"
            value={refinancePurpose}
            onChange={(val) => {
              setRefinancePurpose(val);
              saveMismoField("refinance_purpose", val);
            }}
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
          onBlur={() => saveMismoField("title_name", titleName)}
          helperText="Full legal name(s) as they should appear on title"
        />
        <Select
          label="Manner in which title will be held"
          name="title_manner"
          value={titleManner}
          onChange={(val) => {
            setTitleManner(val);
            saveMismoField("title_manner", val);
          }}
          options={TITLE_MANNER_OPTIONS}
          placeholder="Select..."
        />
        <RadioGroup
          label="Estate will be held in"
          name="estate_type"
          value={estateType}
          onChange={(val) => {
            setEstateType(val);
            saveMismoField("estate_type", val);
          }}
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
              onBlur={() => saveMismoField("leasehold_expiry", leaseholdExpiry)}
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
          onChange={(val) => {
            setDownPaymentSource(val);
            saveMismoField("down_payment_source", val);
          }}
          options={DOWN_PAYMENT_SOURCE_OPTIONS}
          placeholder="Select source..."
        />
        <div className="max-w-xs">
          <CurrencyInput
            label="HOA Monthly Payment"
            name="hoa_payment"
            value={hoaPayment}
            onChange={(val) => {
              setHoaPayment(val);
              saveMismoField("hoa_payment", val);
            }}
            helperText="Leave blank if not applicable"
          />
        </div>
      </FormSection>
    </div>
  );
};

export default Section4LoanProperty;

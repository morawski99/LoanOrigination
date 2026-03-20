import React, { useState } from "react";
import { PlusCircle, Trash2 } from "lucide-react";
import {
  Select,
  CurrencyInput,
  FormSection,
  Input,
  Checkbox,
  Button,
} from "@/design-system/components";
import { AssetType, LiabilityType, PropertyUsageType } from "@/types/urla";
import type {
  FullBorrower,
  BorrowerAsset,
  BorrowerLiability,
  RealEstateOwned,
} from "@/types/urla";
import type { UseURLAFormReturn } from "../hooks/useURLAForm";

interface Section3Props {
  borrower: FullBorrower | undefined;
  formHook: UseURLAFormReturn;
}

const ASSET_TYPE_OPTIONS = [
  { value: AssetType.CHECKING_ACCOUNT, label: "Checking Account" },
  { value: AssetType.SAVINGS_ACCOUNT, label: "Savings Account" },
  { value: AssetType.MONEY_MARKET_FUND, label: "Money Market Fund" },
  { value: AssetType.CERTIFICATE_OF_DEPOSIT, label: "Certificate of Deposit" },
  { value: AssetType.MUTUAL_FUND, label: "Mutual Fund" },
  { value: AssetType.STOCK, label: "Stock" },
  { value: AssetType.BOND, label: "Bond" },
  { value: AssetType.RETIREMENT_FUND, label: "Retirement Fund / 401k" },
  { value: AssetType.LIFE_INSURANCE, label: "Life Insurance" },
  { value: AssetType.TRUST_ACCOUNT, label: "Trust Account" },
  { value: AssetType.GIFT_FUNDS, label: "Gift Funds" },
  { value: AssetType.GIFT_OF_EQUITY, label: "Gift of Equity" },
  { value: AssetType.GRANT_FUNDS, label: "Grant Funds" },
  { value: AssetType.NET_PROCEEDS_FROM_SALE, label: "Net Proceeds From Sale" },
  { value: AssetType.OTHER_LIQUID_ASSETS, label: "Other Liquid Assets" },
  { value: AssetType.OTHER_NON_LIQUID_ASSETS, label: "Other Non-Liquid Assets" },
];

const LIABILITY_TYPE_OPTIONS = [
  { value: LiabilityType.REVOLVING, label: "Revolving (Credit Card)" },
  { value: LiabilityType.INSTALLMENT, label: "Installment (Auto / Personal)" },
  { value: LiabilityType.MORTGAGE_LOAN, label: "Mortgage Loan" },
  { value: LiabilityType.HELOC, label: "HELOC" },
  { value: LiabilityType.LEASE_PAYMENTS, label: "Lease Payments" },
  { value: LiabilityType.OPEN_30_DAY_CHARGE_ACCOUNT, label: "30-Day Charge Account" },
  { value: LiabilityType.COLLECTIONS_JUDGEMENTS_AND_LIENS, label: "Collections / Judgements / Liens" },
  { value: LiabilityType.TAXES, label: "Taxes" },
  { value: LiabilityType.OTHER, label: "Other" },
];

const PROPERTY_USAGE_OPTIONS = [
  { value: PropertyUsageType.PRIMARY_RESIDENCE, label: "Primary Residence" },
  { value: PropertyUsageType.SECOND_HOME, label: "Second Home" },
  { value: PropertyUsageType.INVESTOR, label: "Investment Property" },
  { value: PropertyUsageType.FHA_SECONDARY_RESIDENCE, label: "FHA Secondary Residence" },
];

const GIFT_SOURCE_OPTIONS = [
  { value: "Relative", label: "Relative" },
  { value: "Employer", label: "Employer" },
  { value: "FederalAgency", label: "Federal Agency" },
  { value: "StateAgency", label: "State / Local Agency" },
  { value: "NonProfit", label: "Non-Profit Organization" },
  { value: "Other", label: "Other" },
];

export const Section3Assets: React.FC<Section3Props> = ({ borrower, formHook }) => {
  const {
    saveAsset,
    removeAsset,
    saveLiability,
    editLiability,
    removeLiability,
    saveREO,
    editREO,
    removeREO,
  } = formHook;

  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showLiabilityForm, setShowLiabilityForm] = useState(false);
  const [showREOForm, setShowREOForm] = useState(false);

  const assets = borrower?.assets ?? [];
  const liabilities = borrower?.liabilities ?? [];
  const reos = borrower?.reo_properties ?? [];

  const totalAssets = assets.reduce((sum, a) => sum + a.current_value_amount, 0);
  const totalMonthlyPayments = liabilities
    .filter((l) => !l.exclude_from_liabilities_indicator)
    .reduce((sum, l) => sum + (l.monthly_payment_amount ?? 0), 0);
  const totalUnpaidBalance = liabilities.reduce(
    (sum, l) => sum + (l.unpaid_balance_amount ?? 0),
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-neutral-900">
          Section 3: Assets and Liabilities
        </h2>
        <p className="text-sm text-neutral-600 mt-1">
          List all assets and outstanding liabilities.
        </p>
      </div>

      {/* 3A: Assets */}
      <FormSection title="Assets" isComplete={assets.length > 0}>
        {assets.map((asset) => (
          <AssetRow
            key={asset.id}
            asset={asset}
            onDelete={() => removeAsset(asset.id)}
          />
        ))}

        {showAssetForm ? (
          <AssetForm
            onSave={(data) => {
              saveAsset(data);
              setShowAssetForm(false);
            }}
            onCancel={() => setShowAssetForm(false)}
          />
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowAssetForm(true)}
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            Add Asset
          </Button>
        )}

        {assets.length > 0 && (
          <div className="flex justify-between items-center pt-3 border-t border-neutral-200 text-sm font-semibold text-neutral-800">
            <span>Total Assets</span>
            <span>${totalAssets.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
      </FormSection>

      {/* 3B: Liabilities */}
      <FormSection title="Liabilities">
        {liabilities.map((liability) => (
          <LiabilityRow
            key={liability.id}
            liability={liability}
            onDelete={() => removeLiability(liability.id)}
            onUpdate={(data) => editLiability(liability.id, data)}
          />
        ))}

        {showLiabilityForm ? (
          <LiabilityForm
            onSave={(data) => {
              saveLiability(data);
              setShowLiabilityForm(false);
            }}
            onCancel={() => setShowLiabilityForm(false)}
          />
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowLiabilityForm(true)}
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            Add Liability
          </Button>
        )}

        {liabilities.length > 0 && (
          <div className="space-y-1 pt-3 border-t border-neutral-200 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-600">Total Monthly Payments</span>
              <span className="font-semibold">
                ${totalMonthlyPayments.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Total Unpaid Balances</span>
              <span className="font-semibold">
                ${totalUnpaidBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </FormSection>

      {/* 3C: Real Estate Owned */}
      <FormSection title="Real Estate Owned" collapsible>
        {reos.map((reo) => (
          <REORow
            key={reo.id}
            reo={reo}
            liabilities={liabilities}
            onDelete={() => removeREO(reo.id)}
            onUpdate={(data) => editREO(reo.id, data)}
          />
        ))}

        {showREOForm ? (
          <REOForm
            liabilities={liabilities}
            onSave={(data) => {
              saveREO(data);
              setShowREOForm(false);
            }}
            onCancel={() => setShowREOForm(false)}
          />
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowREOForm(true)}
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            Add Property
          </Button>
        )}
      </FormSection>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Asset sub-components
// ---------------------------------------------------------------------------

function AssetRow({ asset, onDelete }: { asset: BorrowerAsset; onDelete: () => void }) {
  const typeLabel =
    ASSET_TYPE_OPTIONS.find((o) => o.value === asset.asset_type)?.label ??
    asset.asset_type;
  return (
    <div className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0">
      <div className="text-sm">
        <p className="font-medium text-neutral-900">{typeLabel}</p>
        {asset.financial_institution_name && (
          <p className="text-neutral-500 text-xs">
            {asset.financial_institution_name}
            {asset.account_identifier ? ` ****${asset.account_identifier}` : ""}
          </p>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-neutral-800">
          ${asset.current_value_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <button
          type="button"
          aria-label="Remove asset"
          onClick={onDelete}
          className="text-neutral-400 hover:text-error transition-colors focus:outline-none focus:ring-2 focus:ring-error/50 rounded p-1"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

interface AssetFormProps {
  onSave: (data: Parameters<UseURLAFormReturn["saveAsset"]>[0]) => void;
  onCancel: () => void;
}

function AssetForm({ onSave, onCancel }: AssetFormProps) {
  const [assetType, setAssetType] = useState("");
  const [institution, setInstitution] = useState("");
  const [accountId, setAccountId] = useState("");
  const [value, setValue] = useState("");
  const [giftSource, setGiftSource] = useState("");
  const [isDeplete, setIsDeplete] = useState(false);

  const isGiftType =
    assetType === AssetType.GIFT_FUNDS || assetType === AssetType.GIFT_OF_EQUITY;

  return (
    <div className="p-4 border border-neutral-200 rounded-lg bg-neutral-50 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Asset Type"
          name="asset_type"
          value={assetType}
          onChange={setAssetType}
          options={ASSET_TYPE_OPTIONS}
          required
          placeholder="Select type..."
        />
        <CurrencyInput
          label="Current Value"
          name="current_value_amount"
          value={value}
          onChange={setValue}
          required
        />
      </div>

      {assetType && !isGiftType && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Financial Institution"
            name="institution"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
          />
          <Input
            label="Account # (last 4)"
            name="account_id"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value.slice(0, 4))}
            maxLength={4}
          />
        </div>
      )}

      {isGiftType && (
        <Select
          label="Gift Source"
          name="gift_source"
          value={giftSource}
          onChange={setGiftSource}
          options={GIFT_SOURCE_OPTIONS}
          placeholder="Select source..."
        />
      )}

      <Checkbox
        label="This asset will be depleted at / before closing"
        name="is_deplete"
        checked={isDeplete}
        onChange={setIsDeplete}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!assetType || !value}
          onClick={() =>
            onSave({
              asset_type: assetType as AssetType,
              financial_institution_name: institution || undefined,
              account_identifier: accountId || undefined,
              current_value_amount: parseFloat(value.replace(/,/g, "")),
              gift_source_type: giftSource || undefined,
              is_deplete_indicator: isDeplete,
            })
          }
        >
          Add Asset
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Liability sub-components
// ---------------------------------------------------------------------------

function LiabilityRow({
  liability,
  onDelete,
  onUpdate,
}: {
  liability: BorrowerLiability;
  onDelete: () => void;
  onUpdate: (data: Partial<BorrowerLiability>) => void;
}) {
  const typeLabel =
    LIABILITY_TYPE_OPTIONS.find((o) => o.value === liability.liability_type)?.label ??
    liability.liability_type;

  return (
    <div className="p-3 border border-neutral-200 rounded-lg bg-white">
      <div className="flex items-start justify-between">
        <div className="text-sm">
          <p className="font-medium text-neutral-900">
            {liability.creditor_name ?? typeLabel}
          </p>
          <p className="text-neutral-500 text-xs">
            {typeLabel}
            {liability.account_identifier ? ` ****${liability.account_identifier}` : ""}
          </p>
        </div>
        <button
          type="button"
          aria-label="Remove liability"
          onClick={onDelete}
          className="text-neutral-400 hover:text-error transition-colors focus:outline-none focus:ring-2 focus:ring-error/50 rounded p-1"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <div className="flex gap-4 mt-2 text-xs text-neutral-600">
        {liability.monthly_payment_amount !== null && liability.monthly_payment_amount !== undefined && (
          <span>${liability.monthly_payment_amount.toLocaleString()}/mo</span>
        )}
        {liability.unpaid_balance_amount !== null && liability.unpaid_balance_amount !== undefined && (
          <span>Balance: ${liability.unpaid_balance_amount.toLocaleString()}</span>
        )}
      </div>
      <div className="flex gap-4 mt-2">
        <Checkbox
          label="Will be paid off at/before closing"
          name={`payoff-${liability.id}`}
          checked={liability.will_be_paid_off_indicator}
          onChange={(checked) => onUpdate({ will_be_paid_off_indicator: checked })}
        />
        <Checkbox
          label="Exclude from liabilities"
          name={`exclude-${liability.id}`}
          checked={liability.exclude_from_liabilities_indicator}
          onChange={(checked) =>
            onUpdate({ exclude_from_liabilities_indicator: checked })
          }
        />
      </div>
    </div>
  );
}

interface LiabilityFormProps {
  onSave: (data: Parameters<UseURLAFormReturn["saveLiability"]>[0]) => void;
  onCancel: () => void;
}

function LiabilityForm({ onSave, onCancel }: LiabilityFormProps) {
  const [liabilityType, setLiabilityType] = useState("");
  const [creditor, setCreditor] = useState("");
  const [accountId, setAccountId] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [unpaidBalance, setUnpaidBalance] = useState("");
  const [monthsRemaining, setMonthsRemaining] = useState("");
  const [willPayOff, setWillPayOff] = useState(false);

  return (
    <div className="p-4 border border-neutral-200 rounded-lg bg-neutral-50 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Liability Type"
          name="liability_type"
          value={liabilityType}
          onChange={setLiabilityType}
          options={LIABILITY_TYPE_OPTIONS}
          required
          placeholder="Select type..."
        />
        <Input
          label="Creditor Name"
          name="creditor_name"
          value={creditor}
          onChange={(e) => setCreditor(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <CurrencyInput
          label="Monthly Payment"
          name="monthly_payment"
          value={monthlyPayment}
          onChange={setMonthlyPayment}
        />
        <CurrencyInput
          label="Unpaid Balance"
          name="unpaid_balance"
          value={unpaidBalance}
          onChange={setUnpaidBalance}
        />
        <Input
          label="Months Remaining"
          name="months_remaining"
          type="number"
          min={0}
          value={monthsRemaining}
          onChange={(e) => setMonthsRemaining(e.target.value)}
        />
        <Input
          label="Account # (last 4)"
          name="account_id"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value.slice(0, 4))}
          maxLength={4}
        />
      </div>
      <Checkbox
        label="Will be paid off at/before closing"
        name="will_pay_off"
        checked={willPayOff}
        onChange={setWillPayOff}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!liabilityType}
          onClick={() =>
            onSave({
              liability_type: liabilityType as LiabilityType,
              creditor_name: creditor || undefined,
              account_identifier: accountId || undefined,
              monthly_payment_amount: monthlyPayment
                ? parseFloat(monthlyPayment.replace(/,/g, ""))
                : undefined,
              unpaid_balance_amount: unpaidBalance
                ? parseFloat(unpaidBalance.replace(/,/g, ""))
                : undefined,
              months_remaining: monthsRemaining
                ? parseInt(monthsRemaining, 10)
                : undefined,
              will_be_paid_off_indicator: willPayOff,
              exclude_from_liabilities_indicator: false,
            })
          }
        >
          Add Liability
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// REO sub-components
// ---------------------------------------------------------------------------

function REORow({
  reo,
  onDelete,
}: {
  reo: RealEstateOwned;
  liabilities: BorrowerLiability[];
  onDelete: () => void;
  onUpdate: (data: Partial<RealEstateOwned>) => void;
}) {
  const usageLabel =
    PROPERTY_USAGE_OPTIONS.find((o) => o.value === reo.property_usage_type)?.label ??
    reo.property_usage_type;

  return (
    <div className="flex items-start justify-between p-4 border border-neutral-200 rounded-lg bg-white">
      <div className="text-sm">
        <p className="font-medium text-neutral-900">
          {reo.property_address_line}
        </p>
        <p className="text-neutral-500 text-xs">
          {reo.city}, {reo.state} {reo.zip} · {usageLabel}
        </p>
        {reo.present_market_value_amount !== null && reo.present_market_value_amount !== undefined && (
          <p className="text-xs text-neutral-500 mt-0.5">
            Market Value: ${reo.present_market_value_amount.toLocaleString()}
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label="Remove property"
        onClick={onDelete}
        className="text-neutral-400 hover:text-error transition-colors focus:outline-none focus:ring-2 focus:ring-error/50 rounded p-1"
      >
        <Trash2 className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

interface REOFormProps {
  liabilities: BorrowerLiability[];
  onSave: (data: Parameters<UseURLAFormReturn["saveREO"]>[0]) => void;
  onCancel: () => void;
}

function REOForm({ liabilities, onSave, onCancel }: REOFormProps) {
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [usageType, setUsageType] = useState("");
  const [pendingSale, setPendingSale] = useState(false);
  const [marketValue, setMarketValue] = useState("");
  const [monthlyRental, setMonthlyRental] = useState("");
  const [mortgagePayment, setMortgagePayment] = useState("");
  const [linkedLiabilityId, setLinkedLiabilityId] = useState("");

  const mortgageOptions = liabilities
    .filter((l) => l.liability_type === LiabilityType.MORTGAGE_LOAN)
    .map((l) => ({
      value: l.id,
      label: `${l.creditor_name ?? "Mortgage"} ${l.account_identifier ? `****${l.account_identifier}` : ""}`,
    }));

  return (
    <div className="p-4 border border-neutral-200 rounded-lg bg-neutral-50 space-y-4">
      <Input
        label="Property Street Address"
        name="property_address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        required
      />
      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-3">
          <Input
            label="City"
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>
        <div className="col-span-1">
          <Input
            label="State"
            name="state"
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
            required
            maxLength={2}
          />
        </div>
        <div className="col-span-2">
          <Input
            label="ZIP"
            name="zip"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Property Usage"
          name="usage_type"
          value={usageType}
          onChange={setUsageType}
          options={PROPERTY_USAGE_OPTIONS}
          required
          placeholder="Select usage..."
        />
        {mortgageOptions.length > 0 && (
          <Select
            label="Linked Mortgage"
            name="linked_mortgage"
            value={linkedLiabilityId}
            onChange={setLinkedLiabilityId}
            options={[{ value: "", label: "None" }, ...mortgageOptions]}
            placeholder="Select mortgage..."
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <CurrencyInput
          label="Market Value"
          name="market_value"
          value={marketValue}
          onChange={setMarketValue}
        />
        <CurrencyInput
          label="Monthly Rental Income"
          name="monthly_rental"
          value={monthlyRental}
          onChange={setMonthlyRental}
        />
        <CurrencyInput
          label="Monthly Mortgage Payment"
          name="mortgage_payment"
          value={mortgagePayment}
          onChange={setMortgagePayment}
        />
      </div>

      <Checkbox
        label="Pending sale"
        name="pending_sale"
        checked={pendingSale}
        onChange={setPendingSale}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!address || !usageType}
          onClick={() =>
            onSave({
              property_address_line: address,
              city,
              state,
              zip,
              property_usage_type: usageType as PropertyUsageType,
              pending_sale_indicator: pendingSale,
              present_market_value_amount: marketValue
                ? parseFloat(marketValue.replace(/,/g, ""))
                : undefined,
              monthly_rental_income_amount: monthlyRental
                ? parseFloat(monthlyRental.replace(/,/g, ""))
                : undefined,
              mortgage_payment_amount: mortgagePayment
                ? parseFloat(mortgagePayment.replace(/,/g, ""))
                : undefined,
              mortgage_liability_id: linkedLiabilityId || undefined,
            })
          }
        >
          Add Property
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default Section3Assets;

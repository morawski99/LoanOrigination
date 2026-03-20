import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Trash2, CheckCircle, AlertTriangle } from "lucide-react";
import {
  Input,
  Select,
  RadioGroup,
  CurrencyInput,
  DateInput,
  PhoneInput,
  FormSection,
  AddressFields,
  Checkbox,
  Button,
} from "@/design-system/components";
import {
  employmentSchema,
  hasTwoYearEmploymentHistory,
  type EmploymentFormData,
} from "../validation/employmentSchema";
import { EmploymentStatusType, OtherIncomeType } from "@/types/urla";
import type { FullBorrower, BorrowerEmployment, OtherIncome } from "@/types/urla";
import type { UseURLAFormReturn } from "../hooks/useURLAForm";

interface Section2Props {
  borrower: FullBorrower | undefined;
  formHook: UseURLAFormReturn;
}

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: EmploymentStatusType.EMPLOYED, label: "Employed" },
  { value: EmploymentStatusType.SELF_EMPLOYED, label: "Self-Employed" },
  { value: EmploymentStatusType.RETIRED, label: "Retired" },
  {
    value: EmploymentStatusType.UNEMPLOYED_NOT_IN_LABOR_FORCE,
    label: "Not Employed",
  },
  { value: EmploymentStatusType.OTHER, label: "Other" },
];

const OTHER_INCOME_OPTIONS: { value: string; label: string }[] = [
  { value: OtherIncomeType.ALIMONY_CHILD_SUPPORT, label: "Alimony / Child Support" },
  { value: OtherIncomeType.CAPITAL_GAINS, label: "Capital Gains" },
  { value: OtherIncomeType.DISABILITY, label: "Disability" },
  { value: OtherIncomeType.INTEREST_DIVIDENDS, label: "Interest / Dividends" },
  { value: OtherIncomeType.PENSION, label: "Pension" },
  { value: OtherIncomeType.RENTAL_INCOME, label: "Rental Income" },
  { value: OtherIncomeType.RETIREMENT_FUNDS, label: "Retirement Funds" },
  { value: OtherIncomeType.SOCIAL_SECURITY_INCOME, label: "Social Security" },
  { value: OtherIncomeType.TRUST_INCOME, label: "Trust Income" },
  { value: OtherIncomeType.VA_BENEFITS_NON_EDUCATIONAL, label: "VA Benefits (Non-Educational)" },
  { value: OtherIncomeType.OTHER, label: "Other" },
];

export const Section2Employment: React.FC<Section2Props> = ({
  borrower,
  formHook,
}) => {
  const { saveEmployment, editEmployment, removeEmployment, saveOtherIncome, removeOtherIncome } =
    formHook;

  const [showAddEmployment, setShowAddEmployment] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);

  const employments = borrower?.employments ?? [];
  const otherIncomes = borrower?.other_incomes ?? [];
  const hasEnoughHistory = hasTwoYearEmploymentHistory(employments);

  // Calculate total monthly income
  const totalEmploymentIncome = employments.reduce((sum, e) => {
    return (
      sum +
      (e.base_income_amount ?? 0) +
      (e.overtime_income_amount ?? 0) +
      (e.bonus_income_amount ?? 0) +
      (e.commission_income_amount ?? 0) +
      (e.military_entitlements_amount ?? 0) +
      (e.other_income_amount ?? 0)
    );
  }, 0);

  const totalOtherIncome = otherIncomes.reduce(
    (sum, i) => sum + i.monthly_income_amount,
    0
  );
  const grandTotal = totalEmploymentIncome + totalOtherIncome;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-neutral-900">
          Section 2: Employment and Income
        </h2>
        <p className="text-sm text-neutral-600 mt-1">
          List all employment for the past 2 years, most recent first.
        </p>
      </div>

      {/* Current Employment */}
      <FormSection
        title="Current Employment"
        isComplete={employments.some((e) => e.is_current)}
      >
        {employments
          .filter((e) => e.is_current)
          .map((emp) => (
            <ExistingEmploymentCard
              key={emp.id}
              employment={emp}
              onDelete={() => removeEmployment(emp.id)}
              onUpdate={(data) => editEmployment(emp.id, data)}
            />
          ))}

        {showAddEmployment ? (
          <EmploymentEntryForm
            isCurrent
            onSave={(data) => {
              saveEmployment({ ...data, is_current: true });
              setShowAddEmployment(false);
            }}
            onCancel={() => setShowAddEmployment(false)}
          />
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowAddEmployment(true)}
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            Add Current Employment
          </Button>
        )}
      </FormSection>

      {/* Previous Employment — shown if < 2 years */}
      {!hasEnoughHistory && (
        <FormSection
          title="Previous Employment"
          description="We need 2 years of employment history."
        >
          {employments
            .filter((e) => !e.is_current)
            .map((emp) => (
              <ExistingEmploymentCard
                key={emp.id}
                employment={emp}
                onDelete={() => removeEmployment(emp.id)}
                onUpdate={(data) => editEmployment(emp.id, data)}
              />
            ))}

          {!hasEnoughHistory && (
            <div
              className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded text-sm text-warning"
              role="alert"
            >
              <AlertTriangle
                className="w-4 h-4 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>
                Please add previous employment until you have 2 years of continuous history.
              </span>
            </div>
          )}

          <PreviousEmploymentForm
            onSave={(data) => saveEmployment({ ...data, is_current: false })}
          />
        </FormSection>
      )}

      {hasEnoughHistory && (
        <div className="flex items-center gap-2 text-sm text-success">
          <CheckCircle className="w-4 h-4" aria-hidden="true" />
          2-year employment history satisfied
        </div>
      )}

      {/* Other Income */}
      <FormSection title="Other Income Sources (Non-Employment)">
        <p className="text-xs text-neutral-500 -mt-2">
          Alimony, child support, or separate maintenance income need not be
          disclosed if you do not wish to have it considered for this loan.
        </p>

        {otherIncomes.map((income) => (
          <ExistingIncomeRow
            key={income.id}
            income={income}
            onDelete={() => removeOtherIncome(income.id)}
          />
        ))}

        {showAddIncome ? (
          <OtherIncomeForm
            onSave={(data) => {
              saveOtherIncome(data);
              setShowAddIncome(false);
            }}
            onCancel={() => setShowAddIncome(false)}
          />
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowAddIncome(true)}
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            Add Income Source
          </Button>
        )}
      </FormSection>

      {/* Total Income Summary */}
      <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
        <h3 className="text-sm font-semibold text-primary-800 mb-3">
          Total Monthly Income Summary
        </h3>
        <dl className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <dt className="text-neutral-600">Employment Income</dt>
            <dd className="font-medium">${totalEmploymentIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-neutral-600">Other Income</dt>
            <dd className="font-medium">${totalOtherIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}</dd>
          </div>
          <hr className="border-primary-200 my-1" />
          <div className="flex justify-between text-base font-semibold text-primary-800">
            <dt>Total Monthly Income</dt>
            <dd>${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface EmploymentEntryFormProps {
  isCurrent: boolean;
  onSave: (data: Partial<BorrowerEmployment>) => void;
  onCancel: () => void;
}

function EmploymentEntryForm({ isCurrent, onSave, onCancel }: EmploymentEntryFormProps) {
  const { control, register, watch, handleSubmit, formState: { errors } } = useForm<EmploymentFormData>({
    resolver: zodResolver(employmentSchema),
    defaultValues: {
      employment_status_type: EmploymentStatusType.EMPLOYED,
      is_current: isCurrent,
      is_primary: true,
      self_employed_indicator: false,
    },
  });

  const status = watch("employment_status_type");
  const isSelfEmployed = watch("self_employed_indicator");
  const isEmployed =
    status === EmploymentStatusType.EMPLOYED ||
    status === EmploymentStatusType.SELF_EMPLOYED;

  return (
    <div className="p-4 border border-neutral-200 rounded-lg bg-neutral-50 space-y-4">
      <Controller
        name="employment_status_type"
        control={control}
        render={({ field }) => (
          <RadioGroup
            label="Employment Status"
            name="employment_status_type"
            value={field.value}
            onChange={field.onChange}
            options={EMPLOYMENT_STATUS_OPTIONS}
            required
            layout="horizontal"
            error={errors.employment_status_type?.message}
          />
        )}
      />

      {isEmployed && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Employer / Business Name"
              name="employer_name"
              required
              error={errors.employer_name?.message}
              {...register("employer_name")}
            />
            <Controller
              name="employer_phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  label="Employer Phone"
                  name="employer_phone"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  error={errors.employer_phone?.message}
                />
              )}
            />
          </div>

          <Input
            label="Position / Title"
            name="position_description"
            error={errors.position_description?.message}
            {...register("position_description")}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller
              name="start_date"
              control={control}
              render={({ field }) => (
                <DateInput
                  label="Start Date"
                  name="start_date"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  required
                  maxDate={new Date().toISOString().split("T")[0]}
                  error={errors.start_date?.message}
                />
              )}
            />
            {!isCurrent && (
              <Controller
                name="end_date"
                control={control}
                render={({ field }) => (
                  <DateInput
                    label="End Date"
                    name="end_date"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    maxDate={new Date().toISOString().split("T")[0]}
                    error={errors.end_date?.message}
                  />
                )}
              />
            )}
          </div>

          <Controller
            name="self_employed_indicator"
            control={control}
            render={({ field }) => (
              <Checkbox
                label="I am self-employed"
                name="self_employed_indicator"
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />

          {isSelfEmployed && (
            <div className="max-w-xs">
              <Input
                label="Ownership Interest %"
                name="ownership_interest_percent"
                type="number"
                min={0}
                max={100}
                helperText="Percentage of ownership in the business"
                {...register("ownership_interest_percent", {
                  valueAsNumber: true,
                })}
              />
            </div>
          )}

          {/* Income breakdown table */}
          <div>
            <h4 className="text-sm font-semibold text-neutral-800 mb-3">
              Monthly Income
            </h4>
            <div className="space-y-3">
              {(
                [
                  ["base_income_amount", "Base"],
                  ["overtime_income_amount", "Overtime"],
                  ["bonus_income_amount", "Bonus"],
                  ["commission_income_amount", "Commission"],
                  ["military_entitlements_amount", "Military Entitlements"],
                  ["other_income_amount", "Other"],
                ] as const
              ).map(([fieldName, label]) => (
                <div key={fieldName} className="flex items-center gap-4">
                  <label className="text-sm text-neutral-600 w-44 shrink-0">
                    {label}
                  </label>
                  <div className="w-48">
                    <Controller
                      name={fieldName as keyof EmploymentFormData}
                      control={control}
                      render={({ field }) => (
                        <CurrencyInput
                          label=""
                          name={fieldName}
                          value={field.value as string}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSubmit((data) => onSave(data as Partial<BorrowerEmployment>))}
        >
          Save
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function PreviousEmploymentForm({ onSave }: { onSave: (data: Partial<BorrowerEmployment>) => void }) {
  const [show, setShow] = useState(false);
  if (!show) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setShow(true)}
      >
        <PlusCircle className="w-4 h-4" />
        Add Previous Employer
      </Button>
    );
  }
  return (
    <EmploymentEntryForm
      isCurrent={false}
      onSave={(data) => {
        onSave(data);
        setShow(false);
      }}
      onCancel={() => setShow(false)}
    />
  );
}

function ExistingEmploymentCard({
  employment,
  onDelete,
}: {
  employment: BorrowerEmployment;
  onDelete: () => void;
  onUpdate: (data: Partial<BorrowerEmployment>) => void;
}) {
  return (
    <div className="flex items-start justify-between p-4 border border-neutral-200 rounded-lg bg-white">
      <div className="text-sm">
        <p className="font-semibold text-neutral-900">
          {employment.employer_name ?? "Employer"}
        </p>
        <p className="text-neutral-600">
          {employment.position_description ?? employment.employment_status_type}
        </p>
        {employment.start_date && (
          <p className="text-neutral-500 text-xs mt-1">
            Since {employment.start_date}
            {employment.end_date ? ` — ${employment.end_date}` : " (current)"}
          </p>
        )}
        {(employment.base_income_amount ?? 0) > 0 && (
          <p className="text-xs text-neutral-500 mt-0.5">
            Base: ${(employment.base_income_amount ?? 0).toLocaleString()}/mo
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label="Remove employment"
        onClick={onDelete}
        className="text-neutral-400 hover:text-error transition-colors focus:outline-none focus:ring-2 focus:ring-error/50 rounded p-1"
      >
        <Trash2 className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

interface OtherIncomeFormProps {
  onSave: (data: { income_type: OtherIncomeType; monthly_income_amount: number; description?: string }) => void;
  onCancel: () => void;
}

function OtherIncomeForm({ onSave, onCancel }: OtherIncomeFormProps) {
  const [incomeType, setIncomeType] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="p-4 border border-neutral-200 rounded-lg bg-neutral-50 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Income Type"
          name="income_type"
          value={incomeType}
          onChange={setIncomeType}
          options={OTHER_INCOME_OPTIONS}
          required
          placeholder="Select type..."
        />
        <CurrencyInput
          label="Monthly Amount"
          name="monthly_income_amount"
          value={amount}
          onChange={setAmount}
          required
        />
      </div>
      <Input
        label="Description (optional)"
        name="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Additional details about this income source"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!incomeType || !amount}
          onClick={() =>
            onSave({
              income_type: incomeType as OtherIncomeType,
              monthly_income_amount: parseFloat(amount.replace(/,/g, "")),
              description: description || undefined,
            })
          }
        >
          Add Income
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ExistingIncomeRow({
  income,
  onDelete,
}: {
  income: OtherIncome;
  onDelete: () => void;
}) {
  const label =
    OTHER_INCOME_OPTIONS.find((o) => o.value === income.income_type)?.label ??
    income.income_type;
  return (
    <div className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0">
      <div className="text-sm">
        <span className="font-medium text-neutral-900">{label}</span>
        {income.description && (
          <span className="text-neutral-500 ml-2 text-xs">{income.description}</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-neutral-800">
          ${income.monthly_income_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}/mo
        </span>
        <button
          type="button"
          aria-label="Remove income"
          onClick={onDelete}
          className="text-neutral-400 hover:text-error transition-colors focus:outline-none focus:ring-2 focus:ring-error/50 rounded p-1"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default Section2Employment;

import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, PlusCircle, Trash2 } from "lucide-react";
import {
  Input,
  Select,
  RadioGroup,
  CurrencyInput,
  DateInput,
  PhoneInput,
  SSNInput,
  FormSection,
  Checkbox,
  Button,
  AddressFields,
} from "@/design-system/components";
import {
  personalInfoSchema,
  type PersonalInfoFormData,
} from "../validation/personalInfoSchema";
import { hasTwoYearResidencyHistory } from "../validation/residenceSchema";
import {
  CitizenshipResidencyType,
  MaritalStatusType,
  HousingExpenseType,
  ResidencyType,
} from "@/types/urla";
import type { FullBorrower, BorrowerResidence } from "@/types/urla";
import type { UseURLAFormReturn } from "../hooks/useURLAForm";

interface Section1Props {
  borrower: FullBorrower | undefined;
  formHook: UseURLAFormReturn;
}

const SUFFIX_OPTIONS = [
  { value: "", label: "No suffix" },
  { value: "Jr", label: "Jr." },
  { value: "Sr", label: "Sr." },
  { value: "II", label: "II" },
  { value: "III", label: "III" },
  { value: "IV", label: "IV" },
];

const CITIZENSHIP_OPTIONS = [
  { value: CitizenshipResidencyType.US_CITIZEN, label: "U.S. Citizen" },
  {
    value: CitizenshipResidencyType.PERMANENT_RESIDENT_ALIEN,
    label: "Permanent Resident Alien",
  },
  {
    value: CitizenshipResidencyType.NON_PERMANENT_RESIDENT_ALIEN,
    label: "Non-Permanent Resident Alien",
  },
  {
    value: CitizenshipResidencyType.NON_RESIDENT_ALIEN,
    label: "Non-Resident Alien",
  },
];

const MARITAL_STATUS_OPTIONS = [
  { value: MaritalStatusType.MARRIED, label: "Married" },
  { value: MaritalStatusType.SEPARATED, label: "Separated" },
  { value: MaritalStatusType.UNMARRIED, label: "Unmarried", description: "Single, divorced, or widowed" },
];

const HOUSING_OPTIONS = [
  { value: HousingExpenseType.OWN, label: "I own" },
  { value: HousingExpenseType.RENT, label: "I rent" },
  { value: HousingExpenseType.LIVING_RENT_FREE, label: "Living rent-free" },
  { value: HousingExpenseType.OTHER, label: "Other" },
];

export const Section1PersonalInfo: React.FC<Section1Props> = ({
  borrower,
  formHook,
}) => {
  const {
    savePersonalInfo,
    saveResidence,
    editResidence,
    removeResidence,
    triggerAutoSave,
  } = formHook;

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      first_name: borrower?.first_name ?? "",
      last_name: borrower?.last_name ?? "",
      middle_name: borrower?.middle_name ?? "",
      suffix_name: (borrower?.suffix_name as PersonalInfoFormData["suffix_name"]) ?? "",
      email: borrower?.email ?? "",
      phone: borrower?.phone ?? "",
      home_phone: borrower?.home_phone ?? "",
      work_phone: borrower?.work_phone ?? "",
      citizenship_residency_type: borrower?.citizenship_residency_type ?? undefined,
      marital_status_type: borrower?.marital_status_type ?? undefined,
      number_of_dependents: borrower?.number_of_dependents ?? undefined,
      dependent_ages_description: borrower?.dependent_ages_description ?? "",
    },
  });

  const numberOfDependents = watch("number_of_dependents");

  // Reset form when borrower data loads
  useEffect(() => {
    if (borrower) {
      reset({
        first_name: borrower.first_name,
        last_name: borrower.last_name,
        middle_name: borrower.middle_name ?? "",
        suffix_name:
          (borrower.suffix_name as PersonalInfoFormData["suffix_name"]) ?? "",
        email: borrower.email,
        phone: borrower.phone,
        home_phone: borrower.home_phone ?? "",
        work_phone: borrower.work_phone ?? "",
        citizenship_residency_type:
          borrower.citizenship_residency_type ?? undefined,
        marital_status_type: borrower.marital_status_type ?? undefined,
        number_of_dependents: borrower.number_of_dependents ?? undefined,
        dependent_ages_description: borrower.dependent_ages_description ?? "",
      });
    }
  }, [borrower, reset]);

  const handleFieldBlur = () => {
    handleSubmit((data) => {
      triggerAutoSave(() => savePersonalInfo(data));
    })();
  };

  // Determine if we need 2 years of address history
  const currentResidences = borrower?.residences.filter((r) => r.is_current) ?? [];
  const allResidences = borrower?.residences ?? [];
  const hasEnoughHistory = hasTwoYearResidencyHistory(allResidences);

  const [mailingIsSameAsCurrent, setMailingIsSameAsCurrent] = React.useState(true);
  const [showAddFormer, setShowAddFormer] = React.useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-neutral-900">
          Section 1: Borrower Information
        </h2>
        <p className="text-sm text-neutral-600 mt-1">
          Please provide your personal information as it appears on government-issued identification.
        </p>
      </div>

      {/* 1A: Personal Information */}
      <FormSection title="Personal Information" isComplete={false}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <Input
              label="First Name"
              required
              error={errors.first_name?.message}
              {...register("first_name", { onBlur: handleFieldBlur })}
            />
          </div>
          <div className="sm:col-span-1">
            <Input
              label="Middle Name"
              error={errors.middle_name?.message}
              {...register("middle_name", { onBlur: handleFieldBlur })}
            />
          </div>
          <div className="sm:col-span-1">
            <Input
              label="Last Name"
              required
              error={errors.last_name?.message}
              {...register("last_name", { onBlur: handleFieldBlur })}
            />
          </div>
        </div>

        <div className="max-w-xs">
          <Controller
            name="suffix_name"
            control={control}
            render={({ field }) => (
              <Select
                label="Suffix"
                name="suffix_name"
                value={field.value ?? ""}
                onChange={(val) => {
                  field.onChange(val);
                  triggerAutoSave(() => savePersonalInfo({ suffix_name: val }));
                }}
                options={SUFFIX_OPTIONS}
                error={errors.suffix_name?.message}
              />
            )}
          />
        </div>

        <SSNInput
          label="Social Security Number"
          name="ssn"
          value={borrower?.ssn_last4 ?? ""}
          onChange={(val) => {
            if (val.length === 9) {
              triggerAutoSave(() =>
                savePersonalInfo({ ssn_last4: val.slice(-4) })
              );
            }
          }}
          required
        />

        <div className="max-w-xs">
          <DateInput
            label="Date of Birth"
            name="dob"
            value={borrower?.date_of_birth ?? ""}
            onChange={(val) => {
              triggerAutoSave(() => savePersonalInfo({ date_of_birth: val }));
            }}
            required
            maxDate={new Date().toISOString().split("T")[0]}
            helperText="Must be at least 18 years old"
          />
        </div>

        <Controller
          name="citizenship_residency_type"
          control={control}
          render={({ field }) => (
            <RadioGroup
              label="Citizenship / Residency"
              name="citizenship_residency_type"
              value={field.value ?? ""}
              onChange={(val) => {
                field.onChange(val);
                triggerAutoSave(() =>
                  savePersonalInfo({
                    citizenship_residency_type: val as CitizenshipResidencyType,
                  })
                );
              }}
              options={CITIZENSHIP_OPTIONS}
              required
              error={errors.citizenship_residency_type?.message}
              layout="vertical"
            />
          )}
        />

        <Controller
          name="marital_status_type"
          control={control}
          render={({ field }) => (
            <RadioGroup
              label="Marital Status"
              name="marital_status_type"
              value={field.value ?? ""}
              onChange={(val) => {
                field.onChange(val);
                triggerAutoSave(() =>
                  savePersonalInfo({
                    marital_status_type: val as MaritalStatusType,
                  })
                );
              }}
              options={MARITAL_STATUS_OPTIONS}
              required
              error={errors.marital_status_type?.message}
              layout="horizontal"
            />
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm">
          <Controller
            name="number_of_dependents"
            control={control}
            render={({ field }) => (
              <Input
                label="Number of Dependents"
                name="number_of_dependents"
                type="number"
                min={0}
                max={20}
                value={field.value !== undefined ? String(field.value) : ""}
                onChange={(e) => {
                  const val = e.target.value
                    ? parseInt(e.target.value, 10)
                    : undefined;
                  field.onChange(val);
                }}
                onBlur={() => {
                  triggerAutoSave(() =>
                    savePersonalInfo({ number_of_dependents: field.value })
                  );
                }}
                error={errors.number_of_dependents?.message}
              />
            )}
          />
        </div>

        {numberOfDependents !== undefined && numberOfDependents > 0 && (
          <Input
            label="Ages of Dependents"
            placeholder='e.g. "3, 7, 12"'
            helperText="Enter ages separated by commas"
            error={errors.dependent_ages_description?.message}
            {...register("dependent_ages_description", { onBlur: handleFieldBlur })}
          />
        )}
      </FormSection>

      {/* 1B: Contact Information */}
      <FormSection title="Contact Information">
        <Input
          label="Email Address"
          type="email"
          required
          error={errors.email?.message}
          {...register("email", { onBlur: handleFieldBlur })}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <PhoneInput
                label="Cell Phone"
                name="phone"
                value={field.value ?? ""}
                onChange={(val) => {
                  field.onChange(val);
                  triggerAutoSave(() => savePersonalInfo({ phone: val }));
                }}
                required
                error={errors.phone?.message}
              />
            )}
          />
          <Controller
            name="home_phone"
            control={control}
            render={({ field }) => (
              <PhoneInput
                label="Home Phone"
                name="home_phone"
                value={field.value ?? ""}
                onChange={(val) => {
                  field.onChange(val);
                  triggerAutoSave(() => savePersonalInfo({ home_phone: val }));
                }}
                error={errors.home_phone?.message}
              />
            )}
          />
          <Controller
            name="work_phone"
            control={control}
            render={({ field }) => (
              <PhoneInput
                label="Work Phone"
                name="work_phone"
                value={field.value ?? ""}
                onChange={(val) => {
                  field.onChange(val);
                  triggerAutoSave(() => savePersonalInfo({ work_phone: val }));
                }}
                error={errors.work_phone?.message}
              />
            )}
          />
        </div>
      </FormSection>

      {/* 1C: Current Address */}
      <FormSection title="Current Address" isComplete={currentResidences.length > 0}>
        {currentResidences.length === 0 ? (
          <AddressEntryForm
            onSave={(addr) =>
              saveResidence({
                ...addr,
                residency_type: ResidencyType.CURRENT,
                is_current: true,
              })
            }
            isFirst
          />
        ) : (
          <>
            {currentResidences.map((res) => (
              <ExistingResidence
                key={res.id}
                residence={res}
                onDelete={() => removeResidence(res.id)}
                onUpdate={(data) => editResidence(res.id, data)}
              />
            ))}
          </>
        )}
      </FormSection>

      {/* 1D: Former Addresses (if < 2 years history) */}
      {!hasEnoughHistory && (
        <FormSection title="Former Addresses" description="We need at least 2 years of address history.">
          {allResidences
            .filter((r) => !r.is_current)
            .map((res) => (
              <ExistingResidence
                key={res.id}
                residence={res}
                onDelete={() => removeResidence(res.id)}
                onUpdate={(data) => editResidence(res.id, data)}
              />
            ))}

          {!hasEnoughHistory && (
            <div
              className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded text-sm text-warning"
              role="alert"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Please add previous addresses until you have 2 years of
                continuous residence history.
              </span>
            </div>
          )}

          {showAddFormer ? (
            <AddressEntryForm
              onSave={(addr) => {
                saveResidence({
                  ...addr,
                  residency_type: ResidencyType.FORMER,
                  is_current: false,
                });
                setShowAddFormer(false);
              }}
              onCancel={() => setShowAddFormer(false)}
            />
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowAddFormer(true)}
            >
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              Add Former Address
            </Button>
          )}
        </FormSection>
      )}

      {/* 1E: Mailing Address */}
      <FormSection title="Mailing Address" collapsible>
        <Checkbox
          label="Same as current address"
          name="mailing_same_as_current"
          checked={mailingIsSameAsCurrent}
          onChange={setMailingIsSameAsCurrent}
        />

        {!mailingIsSameAsCurrent && (
          <AddressEntryForm
            onSave={(addr) =>
              saveResidence({
                ...addr,
                residency_type: ResidencyType.MAILING,
                is_current: false,
              })
            }
          />
        )}
      </FormSection>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface AddressEntryFormProps {
  onSave: (data: {
    address_line: string;
    unit_number?: string;
    city: string;
    state: string;
    zip: string;
    housing_expense_type: HousingExpenseType;
    monthly_rent_amount?: number;
    residency_start_date?: string;
    residency_end_date?: string;
    country: string;
  }) => void | Promise<void>;
  onCancel?: () => void;
  isFirst?: boolean;
}

function AddressEntryForm({ onSave, onCancel, isFirst }: AddressEntryFormProps) {
  const [values, setValues] = React.useState({
    address_line: "",
    unit_number: "",
    city: "",
    state: "",
    zip: "",
  });
  const [housingType, setHousingType] = React.useState<HousingExpenseType>(
    HousingExpenseType.RENT
  );
  const [monthlyRent, setMonthlyRent] = React.useState("");
  const [startDate, setStartDate] = React.useState("");

  const handleSave = () => {
    void onSave({
      ...values,
      country: "US",
      housing_expense_type: housingType,
      monthly_rent_amount: monthlyRent ? parseFloat(monthlyRent) : undefined,
      residency_start_date: startDate || undefined,
    });
  };

  return (
    <div className="space-y-4 p-4 border border-neutral-200 rounded-lg bg-neutral-50">
      <AddressFields
        values={values}
        onChange={(field, val) => setValues((prev) => ({ ...prev, [field]: val }))}
        required
      />

      <RadioGroup
        label="Housing Situation"
        name="housing_type"
        value={housingType}
        onChange={(val) => setHousingType(val as HousingExpenseType)}
        options={HOUSING_OPTIONS}
        required
        layout="horizontal"
      />

      {housingType === HousingExpenseType.RENT && (
        <div className="max-w-xs">
          <CurrencyInput
            label="Monthly Rent"
            name="monthly_rent"
            value={monthlyRent}
            onChange={setMonthlyRent}
            required
          />
        </div>
      )}

      <div className="max-w-xs">
        <DateInput
          label="Move-in Date"
          name="start_date"
          value={startDate}
          onChange={setStartDate}
          required
          maxDate={new Date().toISOString().split("T")[0]}
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="primary" size="sm" onClick={handleSave}>
          {isFirst ? "Save Address" : "Add Address"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

interface ExistingResidenceProps {
  residence: BorrowerResidence;
  onDelete: () => void;
  onUpdate: (data: Partial<BorrowerResidence>) => void;
}

function ExistingResidence({ residence, onDelete }: ExistingResidenceProps) {
  return (
    <div className="flex items-start justify-between p-4 border border-neutral-200 rounded-lg bg-white">
      <div className="text-sm">
        <p className="font-medium text-neutral-900">
          {residence.address_line}
          {residence.unit_number ? `, ${residence.unit_number}` : ""}
        </p>
        <p className="text-neutral-600 mt-0.5">
          {residence.city}, {residence.state} {residence.zip}
        </p>
        <p className="text-neutral-500 text-xs mt-1 capitalize">
          {residence.housing_expense_type}
          {residence.monthly_rent_amount
            ? ` — $${residence.monthly_rent_amount.toLocaleString()}/mo`
            : ""}
          {residence.residency_start_date ? ` · Since ${residence.residency_start_date}` : ""}
        </p>
      </div>
      <button
        type="button"
        aria-label="Remove address"
        onClick={onDelete}
        className="text-neutral-400 hover:text-error transition-colors focus:outline-none focus:ring-2 focus:ring-error/50 rounded p-1"
      >
        <Trash2 className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default Section1PersonalInfo;

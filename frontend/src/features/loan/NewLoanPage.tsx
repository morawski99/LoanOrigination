import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  ChevronRight,
  ChevronLeft,
  Home,
  CheckCircle,
  User,
  FileText,
} from "lucide-react";
import { Button, Input } from "@/design-system/components";
import { createLoan, createBorrower } from "@/services/api";
import { LoanPurposeType, LoanType } from "@/types/loan";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  loan_purpose_type: z.nativeEnum(LoanPurposeType, {
    errorMap: () => ({ message: "Please select a loan purpose" }),
  }),
  loan_type: z.nativeEnum(LoanType, {
    errorMap: () => ({ message: "Please select a loan type" }),
  }),
  loan_amount: z
    .string()
    .min(1, "Loan amount is required")
    .transform((val) => parseFloat(val.replace(/,/g, "")))
    .pipe(
      z
        .number()
        .positive("Loan amount must be greater than 0")
        .max(50_000_000, "Loan amount cannot exceed $50,000,000")
    ),
  property_address_line: z
    .string()
    .min(5, "Street address is required")
    .max(200),
  property_city: z.string().min(2, "City is required").max(100),
  property_state: z
    .string()
    .length(2, "State must be a 2-letter code (e.g. CA)")
    .toUpperCase(),
  property_zip: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code (e.g. 90210)"),
});

const step2Schema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  middle_name: z.string().max(100).optional(),
  email: z.string().email("Enter a valid email address"),
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .max(20)
    .regex(/^[\d\s\-().+]+$/, "Enter a valid phone number"),
});

type Step1FormData = z.infer<typeof step1Schema>;
type Step2FormData = z.infer<typeof step2Schema>;

// ─── Constants ───────────────────────────────────────────────────────────────

const PURPOSE_OPTIONS = [
  {
    value: LoanPurposeType.PURCHASE,
    label: "Purchase",
    description: "Buying a new home",
  },
  {
    value: LoanPurposeType.REFINANCE,
    label: "Refinance",
    description: "Refinance existing mortgage",
  },
  {
    value: LoanPurposeType.CASH_OUT_REFINANCE,
    label: "Cash-Out Refinance",
    description: "Refinance and take equity out",
  },
  {
    value: LoanPurposeType.CONSTRUCTION_TO_PERMANENT,
    label: "Construction",
    description: "Build and finance a new home",
  },
];

const LOAN_TYPE_OPTIONS = [
  {
    value: LoanType.CONVENTIONAL,
    label: "Conventional",
    description: "Fannie Mae / Freddie Mac",
  },
  {
    value: LoanType.FHA,
    label: "FHA",
    description: "Federal Housing Administration",
  },
  { value: LoanType.VA, label: "VA", description: "Veterans Affairs" },
  {
    value: LoanType.USDA,
    label: "USDA",
    description: "US Dept. of Agriculture",
  },
];

const PURPOSE_LABEL: Record<LoanPurposeType, string> = {
  [LoanPurposeType.PURCHASE]: "Purchase",
  [LoanPurposeType.REFINANCE]: "Refinance",
  [LoanPurposeType.CASH_OUT_REFINANCE]: "Cash-Out Refinance",
  [LoanPurposeType.CONSTRUCTION_TO_PERMANENT]: "Construction",
};

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = ["Loan Info", "Borrower", "Review"];
  return (
    <nav aria-label="Form progress" className="mb-8">
      <ol className="flex items-center gap-0">
        {steps.map((label, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <li key={label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                    isCompleted
                      ? "bg-primary-600 border-primary-600 text-white"
                      : isCurrent
                      ? "border-primary-600 text-primary-600 bg-white"
                      : "border-neutral-300 text-neutral-400 bg-white"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={`text-xs mt-1 font-medium ${
                    isCurrent
                      ? "text-primary-700"
                      : isCompleted
                      ? "text-primary-600"
                      : "text-neutral-400"
                  }`}
                >
                  {label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`h-0.5 w-16 mx-2 mb-4 transition-colors ${
                    isCompleted ? "bg-primary-600" : "bg-neutral-200"
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── Review Row ──────────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-neutral-100 last:border-0 text-sm">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium text-neutral-900 text-right">{value}</dd>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NewLoanPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1FormData | null>(null);
  const [step2Data, setStep2Data] = useState<Step2FormData | null>(null);

  // Step 1 form
  const {
    register: register1,
    handleSubmit: handleSubmit1,
    watch: watch1,
    formState: { errors: errors1 },
  } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      loan_purpose_type: undefined,
      loan_type: undefined,
      property_address_line: "",
      property_city: "",
      property_state: "",
      property_zip: "",
    },
  });

  // Step 2 form
  const {
    register: register2,
    handleSubmit: handleSubmit2,
    formState: { errors: errors2 },
  } = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      middle_name: "",
      email: "",
      phone: "",
    },
  });

  const selectedPurpose = watch1("loan_purpose_type");
  const selectedLoanType = watch1("loan_type");

  // Mutation: create loan then borrower sequentially
  const { mutate: submitForm, isPending, error: mutationError } = useMutation({
    mutationFn: async ({
      loan,
      borrower,
    }: {
      loan: Step1FormData;
      borrower: Step2FormData;
    }) => {
      const createdLoan = await createLoan({
        loan_purpose_type: loan.loan_purpose_type,
        loan_type: loan.loan_type,
        loan_amount: loan.loan_amount,
        property_address_line: loan.property_address_line,
        property_city: loan.property_city,
        property_state: loan.property_state,
        property_zip: loan.property_zip,
      });
      await createBorrower(createdLoan.id, {
        first_name: borrower.first_name,
        last_name: borrower.last_name,
        middle_name: borrower.middle_name || undefined,
        email: borrower.email,
        phone: borrower.phone,
        borrower_classification: "Primary",
      });
      return createdLoan;
    },
    onSuccess: (loan) => {
      navigate(`/loans/${loan.id}`);
    },
  });

  const onStep1Submit = (data: Step1FormData) => {
    setStep1Data(data);
    setCurrentStep(2);
  };

  const onStep2Submit = (data: Step2FormData) => {
    setStep2Data(data);
    setCurrentStep(3);
  };

  const onConfirm = () => {
    if (step1Data && step2Data) {
      submitForm({ loan: step1Data, borrower: step2Data });
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Header */}
      <header className="bg-primary-800 text-white px-6 py-3 flex items-center gap-4 shadow-md">
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5" aria-hidden="true" />
          <span className="font-bold">LoanOrigination</span>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-neutral-200 px-6 py-3">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-neutral-500">
            <li>
              <button
                onClick={() => navigate("/pipeline")}
                className="hover:text-primary-600 flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Pipeline
              </button>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-neutral-900 font-medium">
              New Loan Application
            </li>
          </ol>
        </nav>
      </div>

      <main className="page-container py-8 max-w-3xl" id="main-content">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">
            New Loan Application
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Complete all steps to create a new loan file.
          </p>
        </div>

        <StepIndicator currentStep={currentStep} />

        {/* ── Step 1: Loan Info ─────────────────────────────────────────── */}
        {currentStep === 1 && (
          <form onSubmit={handleSubmit1(onStep1Submit)} noValidate>
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-neutral-900">
                Step 1: Loan Information
              </h2>

              {/* Loan Purpose */}
              <fieldset>
                <legend className="text-sm font-semibold text-neutral-800 mb-3">
                  Loan Purpose{" "}
                  <span className="text-error" aria-label="required">
                    *
                  </span>
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PURPOSE_OPTIONS.map(({ value, label, description }) => (
                    <label
                      key={value}
                      className={`flex items-start gap-3 p-4 rounded border-2 cursor-pointer transition-all ${
                        selectedPurpose === value
                          ? "border-primary-600 bg-primary-50"
                          : "border-neutral-200 hover:border-primary-300 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        value={value}
                        {...register1("loan_purpose_type")}
                        className="mt-0.5 accent-primary-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {label}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                {errors1.loan_purpose_type && (
                  <p
                    role="alert"
                    className="text-sm text-error mt-2 flex items-center gap-1"
                  >
                    <span aria-hidden="true">⚠</span>
                    {errors1.loan_purpose_type.message}
                  </p>
                )}
              </fieldset>

              {/* Loan Type */}
              <fieldset>
                <legend className="text-sm font-semibold text-neutral-800 mb-3">
                  Loan Type{" "}
                  <span className="text-error" aria-label="required">
                    *
                  </span>
                </legend>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {LOAN_TYPE_OPTIONS.map(({ value, label, description }) => (
                    <label
                      key={value}
                      className={`flex flex-col items-center gap-1 p-3 rounded border-2 cursor-pointer transition-all text-center ${
                        selectedLoanType === value
                          ? "border-primary-600 bg-primary-50"
                          : "border-neutral-200 hover:border-primary-300 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        value={value}
                        {...register1("loan_type")}
                        className="sr-only"
                      />
                      <span
                        className={`text-sm font-semibold ${
                          selectedLoanType === value
                            ? "text-primary-700"
                            : "text-neutral-800"
                        }`}
                      >
                        {label}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {description}
                      </span>
                    </label>
                  ))}
                </div>
                {errors1.loan_type && (
                  <p
                    role="alert"
                    className="text-sm text-error mt-2 flex items-center gap-1"
                  >
                    <span aria-hidden="true">⚠</span>
                    {errors1.loan_type.message}
                  </p>
                )}
              </fieldset>

              {/* Loan Amount */}
              <div>
                <Input
                  label="Loan Amount"
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="e.g. 450000"
                  helperText="Enter the requested loan amount in US dollars"
                  error={errors1.loan_amount?.message}
                  {...register1("loan_amount")}
                />
              </div>

              {/* Property Address */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-neutral-800">
                  Property Address
                </h3>
                <Input
                  label="Street Address"
                  required
                  placeholder="e.g. 123 Main Street"
                  error={errors1.property_address_line?.message}
                  {...register1("property_address_line")}
                />
                <div className="grid grid-cols-6 gap-3">
                  <div className="col-span-3">
                    <Input
                      label="City"
                      required
                      placeholder="e.g. Columbus"
                      error={errors1.property_city?.message}
                      {...register1("property_city")}
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      label="State"
                      required
                      placeholder="OH"
                      maxLength={2}
                      error={errors1.property_state?.message}
                      {...register1("property_state")}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="ZIP Code"
                      required
                      placeholder="43215"
                      inputMode="numeric"
                      error={errors1.property_zip?.message}
                      {...register1("property_zip")}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/pipeline")}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md">
                Continue
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
          </form>
        )}

        {/* ── Step 2: Primary Borrower ──────────────────────────────────── */}
        {currentStep === 2 && (
          <form onSubmit={handleSubmit2(onStep2Submit)} noValidate>
            <div className="card p-6 space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Step 2: Primary Borrower
                  </h2>
                  <p className="text-sm text-neutral-500">
                    Basic contact info — full URLA details can be completed in the loan file.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  required
                  placeholder="Jane"
                  autoComplete="given-name"
                  error={errors2.first_name?.message}
                  {...register2("first_name")}
                />
                <Input
                  label="Last Name"
                  required
                  placeholder="Smith"
                  autoComplete="family-name"
                  error={errors2.last_name?.message}
                  {...register2("last_name")}
                />
              </div>

              <Input
                label="Middle Name"
                placeholder="Optional"
                autoComplete="additional-name"
                error={errors2.middle_name?.message}
                {...register2("middle_name")}
              />

              <Input
                label="Email Address"
                type="email"
                required
                placeholder="jane.smith@email.com"
                autoComplete="email"
                error={errors2.email?.message}
                {...register2("email")}
              />

              <Input
                label="Phone Number"
                type="tel"
                required
                placeholder="(555) 123-4567"
                autoComplete="tel"
                error={errors2.phone?.message}
                {...register2("phone")}
              />
            </div>

            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentStep(1)}
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                Back
              </Button>
              <Button type="submit" variant="primary" size="md">
                Review & Create
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
          </form>
        )}

        {/* ── Step 3: Review & Confirm ──────────────────────────────────── */}
        {currentStep === 3 && step1Data && step2Data && (
          <div>
            <div className="card p-6 space-y-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Step 3: Review & Create
                  </h2>
                  <p className="text-sm text-neutral-500">
                    Confirm the details below. A loan number will be auto-generated on creation.
                  </p>
                </div>
              </div>

              {/* Loan summary */}
              <div>
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                  Loan Details
                </h3>
                <dl className="divide-y divide-neutral-100">
                  <ReviewRow
                    label="Purpose"
                    value={PURPOSE_LABEL[step1Data.loan_purpose_type]}
                  />
                  <ReviewRow label="Loan Type" value={step1Data.loan_type} />
                  <ReviewRow
                    label="Loan Amount"
                    value={formatCurrency(step1Data.loan_amount)}
                  />
                  <ReviewRow
                    label="Property"
                    value={`${step1Data.property_address_line}, ${step1Data.property_city}, ${step1Data.property_state} ${step1Data.property_zip}`}
                  />
                </dl>
              </div>

              <div className="border-t border-neutral-200 pt-6">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                  Primary Borrower
                </h3>
                <dl className="divide-y divide-neutral-100">
                  <ReviewRow
                    label="Name"
                    value={[
                      step2Data.first_name,
                      step2Data.middle_name,
                      step2Data.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  />
                  <ReviewRow label="Email" value={step2Data.email} />
                  <ReviewRow label="Phone" value={step2Data.phone} />
                </dl>
              </div>

              {mutationError && (
                <div
                  role="alert"
                  className="p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error flex items-start gap-2"
                >
                  <span aria-hidden="true" className="mt-0.5">⚠</span>
                  <span>
                    {mutationError instanceof Error
                      ? mutationError.message
                      : "Something went wrong. Please try again."}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentStep(2)}
                disabled={isPending}
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                isLoading={isPending}
                onClick={onConfirm}
              >
                {isPending ? "Creating..." : "Create Loan File"}
                {!isPending && (
                  <CheckCircle className="w-4 h-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

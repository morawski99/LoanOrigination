import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { ChevronRight, ChevronLeft, Home, CheckCircle } from "lucide-react";
import { Button, Input } from "@/design-system/components";
import { createLoan } from "@/services/api";
import { LoanPurposeType, LoanType } from "@/types/loan";

const TOTAL_STEPS = 3;

// Step 1 schema
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

type Step1FormData = z.infer<typeof step1Schema>;

const PURPOSE_OPTIONS = [
  { value: LoanPurposeType.PURCHASE, label: "Purchase", description: "Buying a new home" },
  { value: LoanPurposeType.REFINANCE, label: "Refinance", description: "Refinance existing mortgage" },
  { value: LoanPurposeType.CASH_OUT_REFINANCE, label: "Cash-Out Refinance", description: "Refinance and take equity out" },
  { value: LoanPurposeType.CONSTRUCTION_TO_PERMANENT, label: "Construction", description: "Build and finance a new home" },
];

const LOAN_TYPE_OPTIONS = [
  { value: LoanType.CONVENTIONAL, label: "Conventional", description: "Fannie Mae / Freddie Mac" },
  { value: LoanType.FHA, label: "FHA", description: "Federal Housing Administration" },
  { value: LoanType.VA, label: "VA", description: "Veterans Affairs" },
  { value: LoanType.USDA, label: "USDA", description: "US Dept. of Agriculture" },
];

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
                    isCurrent ? "text-primary-700" : isCompleted ? "text-primary-600" : "text-neutral-400"
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

export default function NewLoanPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1FormData | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
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

  const selectedPurpose = watch("loan_purpose_type");
  const selectedLoanType = watch("loan_type");

  const { mutate: submitLoan, isPending, error: mutationError } = useMutation({
    mutationFn: (data: Step1FormData) =>
      createLoan({
        loan_purpose_type: data.loan_purpose_type,
        loan_type: data.loan_type,
        loan_amount: data.loan_amount,
        property_address_line: data.property_address_line,
        property_city: data.property_city,
        property_state: data.property_state,
        property_zip: data.property_zip,
      }),
    onSuccess: (loan) => {
      navigate(`/loans/${loan.id}`);
    },
  });

  const onStep1Submit = (data: Step1FormData) => {
    setStep1Data(data);
    setCurrentStep(2);
  };

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
            <li className="text-neutral-900 font-medium">New Loan Application</li>
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

        {/* Step 1: Loan Purpose & Property */}
        {currentStep === 1 && (
          <form onSubmit={handleSubmit(onStep1Submit)} noValidate>
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
                        {...register("loan_purpose_type")}
                        className="mt-0.5 accent-primary-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {label}
                        </p>
                        <p className="text-xs text-neutral-500">{description}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.loan_purpose_type && (
                  <p role="alert" className="text-sm text-error mt-2 flex items-center gap-1">
                    <span aria-hidden="true">⚠</span>
                    {errors.loan_purpose_type.message}
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
                        {...register("loan_type")}
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
                {errors.loan_type && (
                  <p role="alert" className="text-sm text-error mt-2 flex items-center gap-1">
                    <span aria-hidden="true">⚠</span>
                    {errors.loan_type.message}
                  </p>
                )}
              </fieldset>

              {/* Loan Amount */}
              <div>
                <Input
                  label="Loan Amount"
                  name="loan_amount"
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="e.g. 450000"
                  helperText="Enter the requested loan amount in US dollars"
                  error={errors.loan_amount?.message}
                  {...register("loan_amount")}
                />
              </div>

              {/* Property Address */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-neutral-800">
                  Property Address
                </h3>
                <Input
                  label="Street Address"
                  name="property_address_line"
                  required
                  placeholder="e.g. 123 Main Street"
                  error={errors.property_address_line?.message}
                  {...register("property_address_line")}
                />
                <div className="grid grid-cols-6 gap-3">
                  <div className="col-span-3">
                    <Input
                      label="City"
                      name="property_city"
                      required
                      placeholder="e.g. Columbus"
                      error={errors.property_city?.message}
                      {...register("property_city")}
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      label="State"
                      name="property_state"
                      required
                      placeholder="OH"
                      maxLength={2}
                      error={errors.property_state?.message}
                      {...register("property_state")}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="ZIP Code"
                      name="property_zip"
                      required
                      placeholder="43215"
                      inputMode="numeric"
                      error={errors.property_zip?.message}
                      {...register("property_zip")}
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

        {/* Step 2: Borrower Information (Coming Soon) */}
        {currentStep === 2 && (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">
              Step 2: Borrower Information
            </h2>
            <p className="text-neutral-600 mb-1">Coming soon</p>
            <p className="text-sm text-neutral-400 mb-8">
              This step will collect borrower personal and financial information.
            </p>

            <div className="flex justify-between max-w-sm mx-auto">
              <Button
                variant="secondary"
                onClick={() => setCurrentStep(1)}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                variant="primary"
                isLoading={isPending}
                onClick={() => step1Data && submitLoan(step1Data)}
              >
                Create Loan File
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {mutationError && (
              <p role="alert" className="text-error text-sm mt-4 flex items-center justify-center gap-1">
                <span aria-hidden="true">⚠</span>
                {String(mutationError instanceof Error ? mutationError.message : mutationError)}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

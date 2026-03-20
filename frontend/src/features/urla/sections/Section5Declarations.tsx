import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clsx } from "clsx";
import { Input, FormSection, Checkbox, CurrencyInput } from "@/design-system/components";
import {
  declarationsSchema,
  type DeclarationsFormData,
} from "../validation/declarationsSchema";
import { OccupancyIntentType } from "@/types/urla";
import type { FullBorrower } from "@/types/urla";
import type { UseURLAFormReturn } from "../hooks/useURLAForm";

interface Section5Props {
  borrower: FullBorrower | undefined;
  formHook: UseURLAFormReturn;
}

// Yes/No radio with color feedback
function YesNoQuestion({
  id,
  label,
  value,
  onChange,
  error,
  children,
}: {
  id: string;
  label: string;
  value: boolean | null | undefined;
  onChange: (val: boolean) => void;
  error?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-4">
        <p
          id={id}
          className="text-sm font-medium text-neutral-800 flex-1"
        >
          {label}
        </p>
        <div
          className="flex gap-2 shrink-0"
          role="radiogroup"
          aria-labelledby={id}
          aria-invalid={Boolean(error)}
        >
          {[true, false].map((opt) => {
            const isSelected = value === opt;
            return (
              <button
                key={String(opt)}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onChange(opt)}
                className={clsx(
                  "min-h-[48px] px-5 py-2 rounded border-2 text-sm font-semibold transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2",
                  isSelected && opt === true
                    ? "border-success bg-success/10 text-success"
                    : isSelected && opt === false
                    ? "border-error bg-error/10 text-error"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-primary-300"
                )}
              >
                {opt ? "Yes" : "No"}
              </button>
            );
          })}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-error ml-0">
          {error}
        </p>
      )}
      {children && value === true && (
        <div className="ml-4 pl-4 border-l-2 border-neutral-200 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

export const Section5Declarations: React.FC<Section5Props> = ({
  borrower,
  formHook,
}) => {
  const { saveDeclarations, triggerAutoSave } = formHook;
  const decl = borrower?.declaration;

  const {
    control,
    watch,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DeclarationsFormData>({
    resolver: zodResolver(declarationsSchema),
    defaultValues: {
      occupancy_intent_type: decl?.occupancy_intent_type ?? undefined,
      family_relationship_with_seller_indicator:
        decl?.family_relationship_with_seller_indicator ?? undefined,
      borrowed_down_payment_indicator:
        decl?.borrowed_down_payment_indicator ?? undefined,
      applied_for_other_mortgage_indicator:
        decl?.applied_for_other_mortgage_indicator ?? undefined,
      apply_new_mortgage_indicator:
        decl?.apply_new_mortgage_indicator ?? undefined,
      outstanding_judgment_indicator:
        decl?.outstanding_judgment_indicator ?? undefined,
      declared_bankruptcy_indicator:
        decl?.declared_bankruptcy_indicator ?? undefined,
      bankruptcy_type: decl?.bankruptcy_type ?? "",
      foreclosure_indicator: decl?.foreclosure_indicator ?? undefined,
      party_to_lawsuit_indicator: decl?.party_to_lawsuit_indicator ?? undefined,
      federal_debt_delinquency_indicator:
        decl?.federal_debt_delinquency_indicator ?? undefined,
      alimony_obligation_indicator:
        decl?.alimony_obligation_indicator ?? undefined,
      alimony_amount: decl?.alimony_amount ?? undefined,
      co_signer_indicator: decl?.co_signer_indicator ?? undefined,
      us_citizen_indicator: decl?.us_citizen_indicator ?? undefined,
      permanent_resident_alien_indicator:
        decl?.permanent_resident_alien_indicator ?? undefined,
      ownership_in_past_3_years_indicator:
        decl?.ownership_in_past_3_years_indicator ?? undefined,
      property_ownership_type: decl?.property_ownership_type ?? "",
    },
  });

  useEffect(() => {
    if (decl) {
      reset({
        occupancy_intent_type: decl.occupancy_intent_type ?? undefined,
        outstanding_judgment_indicator: decl.outstanding_judgment_indicator ?? undefined,
        declared_bankruptcy_indicator: decl.declared_bankruptcy_indicator ?? undefined,
        bankruptcy_type: decl.bankruptcy_type ?? "",
        foreclosure_indicator: decl.foreclosure_indicator ?? undefined,
        party_to_lawsuit_indicator: decl.party_to_lawsuit_indicator ?? undefined,
        federal_debt_delinquency_indicator: decl.federal_debt_delinquency_indicator ?? undefined,
        alimony_obligation_indicator: decl.alimony_obligation_indicator ?? undefined,
        alimony_amount: decl.alimony_amount ?? undefined,
        co_signer_indicator: decl.co_signer_indicator ?? undefined,
        us_citizen_indicator: decl.us_citizen_indicator ?? undefined,
        ownership_in_past_3_years_indicator: decl.ownership_in_past_3_years_indicator ?? undefined,
        property_ownership_type: decl.property_ownership_type ?? "",
        family_relationship_with_seller_indicator: decl.family_relationship_with_seller_indicator ?? undefined,
        borrowed_down_payment_indicator: decl.borrowed_down_payment_indicator ?? undefined,
        applied_for_other_mortgage_indicator: decl.applied_for_other_mortgage_indicator ?? undefined,
        apply_new_mortgage_indicator: decl.apply_new_mortgage_indicator ?? undefined,
      });
    }
  }, [decl, reset]);

  const watchedValues = watch();

  const autoSave = () => {
    handleSubmit(
      (data) => triggerAutoSave(() => saveDeclarations(data as DeclarationsFormData)),
      () => {}
    )();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-neutral-900">
          Section 5: Declarations
        </h2>
        <p className="text-sm text-neutral-600 mt-1">
          Please answer all questions carefully. Your answers affect loan processing and approval.
        </p>
      </div>

      {/* Part A */}
      <FormSection title="Part A — About This Property and Your Money for This Loan">
        <Controller
          name="occupancy_intent_type"
          control={control}
          render={({ field }) => (
            <div>
              <p id="occupancy-intent" className="text-sm font-medium text-neutral-800 mb-2">
                A1. Will you occupy this property as your primary residence?{" "}
                <span className="text-error" aria-label="required">*</span>
              </p>
              <div className="flex gap-2" role="radiogroup" aria-labelledby="occupancy-intent">
                {[
                  { val: OccupancyIntentType.PRIMARY_RESIDENCE, label: "Yes — Primary" },
                  { val: OccupancyIntentType.SECOND_HOME, label: "Second Home" },
                  { val: OccupancyIntentType.INVESTMENT_PROPERTY, label: "Investment" },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    role="radio"
                    aria-checked={field.value === val}
                    onClick={() => {
                      field.onChange(val);
                      autoSave();
                    }}
                    className={clsx(
                      "min-h-[48px] px-4 py-2 rounded border-2 text-sm font-medium transition-all",
                      "focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2",
                      field.value === val
                        ? "border-primary-600 bg-primary-50 text-primary-800"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-primary-300"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {errors.occupancy_intent_type && (
                <p role="alert" className="text-sm text-error mt-1">
                  {errors.occupancy_intent_type.message}
                </p>
              )}
            </div>
          )}
        />

        {watchedValues.occupancy_intent_type === OccupancyIntentType.PRIMARY_RESIDENCE && (
          <Controller
            name="ownership_in_past_3_years_indicator"
            control={control}
            render={({ field }) => (
              <YesNoQuestion
                id="ownership-3y"
                label="Did you have an ownership interest in another property in the last 3 years?"
                value={field.value}
                onChange={(val) => {
                  field.onChange(val);
                  autoSave();
                }}
              >
                <div className="max-w-xs">
                  <Input
                    label="Ownership type"
                    name="property_ownership_type"
                    placeholder="e.g. Sole Ownership, Joint With Spouse"
                    {...(control.register("property_ownership_type") as object)}
                  />
                </div>
              </YesNoQuestion>
            )}
          />
        )}

        <Controller
          name="family_relationship_with_seller_indicator"
          control={control}
          render={({ field }) => (
            <YesNoQuestion
              id="family-seller"
              label="A2. Do you have a family or business relationship with the seller?"
              value={field.value}
              onChange={(val) => { field.onChange(val); autoSave(); }}
              error={errors.family_relationship_with_seller_indicator?.message}
            />
          )}
        />

        <Controller
          name="borrowed_down_payment_indicator"
          control={control}
          render={({ field }) => (
            <YesNoQuestion
              id="borrowed-dp"
              label="A3. Are you borrowing any money for this transaction? (e.g., money for closing costs not reflected above)"
              value={field.value}
              onChange={(val) => { field.onChange(val); autoSave(); }}
              error={errors.borrowed_down_payment_indicator?.message}
            />
          )}
        />

        <Controller
          name="applied_for_other_mortgage_indicator"
          control={control}
          render={({ field }) => (
            <YesNoQuestion
              id="other-mortgage"
              label="A4. Have you or will you be applying for a mortgage loan on another property?"
              value={field.value}
              onChange={(val) => { field.onChange(val); autoSave(); }}
              error={errors.applied_for_other_mortgage_indicator?.message}
            />
          )}
        />

        <Controller
          name="apply_new_mortgage_indicator"
          control={control}
          render={({ field }) => (
            <YesNoQuestion
              id="new-credit"
              label="A5. Will you apply for any new credit before closing (auto loan, credit card, etc.)?"
              value={field.value}
              onChange={(val) => { field.onChange(val); autoSave(); }}
              error={errors.apply_new_mortgage_indicator?.message}
            />
          )}
        />
      </FormSection>

      {/* Part B */}
      <FormSection title="Part B — About Your Finances">
        <Controller
          name="outstanding_judgment_indicator"
          control={control}
          render={({ field }) => (
            <YesNoQuestion
              id="judgment"
              label="B1. Are there any outstanding judgments against you?"
              value={field.value}
              onChange={(val) => { field.onChange(val); autoSave(); }}
              error={errors.outstanding_judgment_indicator?.message}
            />
          )}
        />

        <Controller
          name="federal_debt_delinquency_indicator"
          control={control}
          render={({ field }) => (
            <YesNoQuestion
              id="federal-debt"
              label="B2. Are you currently delinquent or in default on a Federal debt?"
              value={field.value}
              onChange={(val) => { field.onChange(val); autoSave(); }}
              error={errors.federal_debt_delinquency_indicator?.message}
            />
          )}
        />

        <Controller
          name="party_to_lawsuit_indicator"
          control={control}
          render={({ field }) => (
            <YesNoQuestion
              id="lawsuit"
              label="B3. Are you a party to a lawsuit in which you potentially have any personal financial liability?"
              value={field.value}
              onChange={(val) => { field.onChange(val); autoSave(); }}
              error={errors.party_to_lawsuit_indicator?.message}
            />
          )}
        />

        <Controller
          name="foreclosure_indicator"
          control={control}
          render={({ field }) => (
            <YesNoQuestion
              id="foreclosure"
              label="B4–B6. Have you had any foreclosure, pre-foreclosure sale, or deed-in-lieu of foreclosure in the past 7 years?"
              value={field.value}
              onChange={(val) => { field.onChange(val); autoSave(); }}
              error={errors.foreclosure_indicator?.message}
            />
          )}
        />

        <Controller
          name="declared_bankruptcy_indicator"
          control={control}
          render={({ field }) => (
            <YesNoQuestion
              id="bankruptcy"
              label="B7. Have you declared bankruptcy within the past 7 years?"
              value={field.value}
              onChange={(val) => { field.onChange(val); autoSave(); }}
              error={errors.declared_bankruptcy_indicator?.message}
            >
              <div>
                <p className="text-sm text-neutral-700 mb-2">Which chapter(s)?</p>
                <div className="flex flex-wrap gap-3">
                  {["Chapter 7", "Chapter 11", "Chapter 12", "Chapter 13"].map(
                    (ch) => (
                      <Checkbox
                        key={ch}
                        label={ch}
                        name={`bankruptcy-${ch}`}
                        checked={watchedValues.bankruptcy_type === ch}
                        onChange={() => {
                          (control.register("bankruptcy_type").onChange as (e: { target: { value: string } }) => void)({
                            target: { value: ch },
                          });
                          autoSave();
                        }}
                      />
                    )
                  )}
                </div>
              </div>
            </YesNoQuestion>
          )}
        />

        <Controller
          name="alimony_obligation_indicator"
          control={control}
          render={({ field }) => (
            <YesNoQuestion
              id="alimony"
              label="Do you have any outstanding alimony or child support obligations?"
              value={field.value}
              onChange={(val) => { field.onChange(val); autoSave(); }}
              error={errors.alimony_obligation_indicator?.message}
            >
              <div className="max-w-xs">
                <CurrencyInput
                  label="Monthly Alimony / Child Support Amount"
                  name="alimony_amount"
                  value={String(watchedValues.alimony_amount ?? "")}
                  onChange={(val) => {
                    (control.register("alimony_amount").onChange as (e: { target: { value: string } }) => void)({
                      target: { value: val },
                    });
                    autoSave();
                  }}
                />
              </div>
            </YesNoQuestion>
          )}
        />

        <Controller
          name="co_signer_indicator"
          control={control}
          render={({ field }) => (
            <YesNoQuestion
              id="co-signer"
              label="Are you a co-signer or guarantor on any debt not listed in this application?"
              value={field.value}
              onChange={(val) => { field.onChange(val); autoSave(); }}
              error={errors.co_signer_indicator?.message}
            />
          )}
        />

        <Controller
          name="us_citizen_indicator"
          control={control}
          render={({ field }) => (
            <YesNoQuestion
              id="citizen"
              label="Are you a U.S. citizen?"
              value={field.value}
              onChange={(val) => { field.onChange(val); autoSave(); }}
              error={errors.us_citizen_indicator?.message}
            />
          )}
        />
      </FormSection>
    </div>
  );
};

export default Section5Declarations;

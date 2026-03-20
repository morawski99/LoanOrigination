import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { Input, FormSection, Checkbox } from "@/design-system/components";
import {
  demographicsSchema,
  type DemographicsFormData,
} from "../validation/demographicsSchema";
import type { FullBorrower } from "@/types/urla";
import type { UseURLAFormReturn } from "../hooks/useURLAForm";

interface Section8Props {
  borrower: FullBorrower | undefined;
  formHook: UseURLAFormReturn;
}

export const Section8Demographics: React.FC<Section8Props> = ({
  borrower,
  formHook,
}) => {
  const { saveDemographics, triggerAutoSave } = formHook;
  const demo = borrower?.demographics;

  const { control, watch, handleSubmit, reset } = useForm<DemographicsFormData>({
    resolver: zodResolver(demographicsSchema),
    defaultValues: {
      ethnicity_hispanic_latino_indicator: demo?.ethnicity_hispanic_latino_indicator ?? undefined,
      ethnicity_mexican_indicator: demo?.ethnicity_mexican_indicator ?? false,
      ethnicity_puerto_rican_indicator: demo?.ethnicity_puerto_rican_indicator ?? false,
      ethnicity_cuban_indicator: demo?.ethnicity_cuban_indicator ?? false,
      ethnicity_other_hispanic_indicator: demo?.ethnicity_other_hispanic_indicator ?? false,
      ethnicity_other_hispanic_description: demo?.ethnicity_other_hispanic_description ?? "",
      ethnicity_not_hispanic_indicator: demo?.ethnicity_not_hispanic_indicator ?? undefined,
      ethnicity_not_provided_indicator: demo?.ethnicity_not_provided_indicator ?? false,
      race_american_indian_indicator: demo?.race_american_indian_indicator ?? false,
      race_american_indian_tribe_name: demo?.race_american_indian_tribe_name ?? "",
      race_asian_indicator: demo?.race_asian_indicator ?? false,
      race_asian_indian_indicator: demo?.race_asian_indian_indicator ?? false,
      race_chinese_indicator: demo?.race_chinese_indicator ?? false,
      race_filipino_indicator: demo?.race_filipino_indicator ?? false,
      race_japanese_indicator: demo?.race_japanese_indicator ?? false,
      race_korean_indicator: demo?.race_korean_indicator ?? false,
      race_vietnamese_indicator: demo?.race_vietnamese_indicator ?? false,
      race_other_asian_indicator: demo?.race_other_asian_indicator ?? false,
      race_other_asian_description: demo?.race_other_asian_description ?? "",
      race_black_african_american_indicator: demo?.race_black_african_american_indicator ?? false,
      race_native_hawaiian_indicator: demo?.race_native_hawaiian_indicator ?? false,
      race_guamanian_chamorro_indicator: demo?.race_guamanian_chamorro_indicator ?? false,
      race_samoan_indicator: demo?.race_samoan_indicator ?? false,
      race_other_pacific_islander_indicator: demo?.race_other_pacific_islander_indicator ?? false,
      race_other_pacific_islander_description: demo?.race_other_pacific_islander_description ?? "",
      race_white_indicator: demo?.race_white_indicator ?? false,
      race_not_provided_indicator: demo?.race_not_provided_indicator ?? false,
      sex_male_indicator: demo?.sex_male_indicator ?? undefined,
      sex_female_indicator: demo?.sex_female_indicator ?? undefined,
      sex_not_provided_indicator: demo?.sex_not_provided_indicator ?? false,
      sex_prefer_not_to_disclose: demo?.sex_prefer_not_to_disclose ?? false,
      collection_method_type: demo?.collection_method_type ?? "",
    },
  });

  useEffect(() => {
    if (demo) {
      reset({
        ethnicity_hispanic_latino_indicator: demo.ethnicity_hispanic_latino_indicator ?? undefined,
        ethnicity_mexican_indicator: demo.ethnicity_mexican_indicator,
        ethnicity_puerto_rican_indicator: demo.ethnicity_puerto_rican_indicator,
        ethnicity_cuban_indicator: demo.ethnicity_cuban_indicator,
        ethnicity_other_hispanic_indicator: demo.ethnicity_other_hispanic_indicator,
        ethnicity_other_hispanic_description: demo.ethnicity_other_hispanic_description ?? "",
        ethnicity_not_hispanic_indicator: demo.ethnicity_not_hispanic_indicator ?? undefined,
        ethnicity_not_provided_indicator: demo.ethnicity_not_provided_indicator,
        race_american_indian_indicator: demo.race_american_indian_indicator,
        race_american_indian_tribe_name: demo.race_american_indian_tribe_name ?? "",
        race_asian_indicator: demo.race_asian_indicator,
        race_asian_indian_indicator: demo.race_asian_indian_indicator,
        race_chinese_indicator: demo.race_chinese_indicator,
        race_filipino_indicator: demo.race_filipino_indicator,
        race_japanese_indicator: demo.race_japanese_indicator,
        race_korean_indicator: demo.race_korean_indicator,
        race_vietnamese_indicator: demo.race_vietnamese_indicator,
        race_other_asian_indicator: demo.race_other_asian_indicator,
        race_other_asian_description: demo.race_other_asian_description ?? "",
        race_black_african_american_indicator: demo.race_black_african_american_indicator,
        race_native_hawaiian_indicator: demo.race_native_hawaiian_indicator,
        race_guamanian_chamorro_indicator: demo.race_guamanian_chamorro_indicator,
        race_samoan_indicator: demo.race_samoan_indicator,
        race_other_pacific_islander_indicator: demo.race_other_pacific_islander_indicator,
        race_other_pacific_islander_description: demo.race_other_pacific_islander_description ?? "",
        race_white_indicator: demo.race_white_indicator,
        race_not_provided_indicator: demo.race_not_provided_indicator,
        sex_male_indicator: demo.sex_male_indicator ?? undefined,
        sex_female_indicator: demo.sex_female_indicator ?? undefined,
        sex_not_provided_indicator: demo.sex_not_provided_indicator,
        sex_prefer_not_to_disclose: demo.sex_prefer_not_to_disclose,
        collection_method_type: demo.collection_method_type ?? "",
      });
    }
  }, [demo, reset]);

  const watchedValues = watch();

  const autoSave = () => {
    handleSubmit(
      (data) => triggerAutoSave(() => saveDemographics(data as DemographicsFormData)),
      () => {}
    )();
  };

  const wrapChange = (field: { onChange: (val: boolean) => void }) => (val: boolean) => {
    field.onChange(val);
    autoSave();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-neutral-900">
          Section 8: Demographic Information
        </h2>
      </div>

      {/* HMDA regulatory notice */}
      <div
        className="p-4 bg-neutral-50 border border-neutral-300 rounded-lg"
        role="note"
        aria-label="HMDA regulatory notice"
      >
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-neutral-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-neutral-700 leading-relaxed">
            The purpose of collecting this information is to help ensure that all applicants are treated fairly and that the housing needs of communities and neighborhoods are being fulfilled. For residential mortgage lending, Federal law requires that we ask applicants for their demographic information (ethnicity, sex, and race) in order to monitor our compliance with equal credit opportunity, fair housing, and home mortgage disclosure laws. You are not required to provide this information, but are encouraged to do so. The law provides that we may not discriminate on the basis of this information, or on whether you choose to provide it.
          </p>
        </div>
      </div>

      {/* Ethnicity */}
      <FormSection title="Ethnicity" description="Check one or more that apply.">
        <div className="space-y-3">
          <Controller
            name="ethnicity_hispanic_latino_indicator"
            control={control}
            render={({ field }) => (
              <div>
                <Checkbox
                  label="Hispanic or Latino"
                  name="ethnicity_hispanic_latino"
                  checked={field.value === true}
                  onChange={(checked) => { field.onChange(checked ? true : undefined); autoSave(); }}
                />
                {field.value === true && (
                  <div className="ml-8 space-y-2 mt-2">
                    {(
                      [
                        ["ethnicity_mexican_indicator", "Mexican"],
                        ["ethnicity_puerto_rican_indicator", "Puerto Rican"],
                        ["ethnicity_cuban_indicator", "Cuban"],
                      ] as const
                    ).map(([fieldName, label]) => (
                      <Controller
                        key={fieldName}
                        name={fieldName}
                        control={control}
                        render={({ field: f }) => (
                          <Checkbox
                            label={label}
                            name={fieldName}
                            checked={f.value}
                            onChange={wrapChange(f)}
                          />
                        )}
                      />
                    ))}
                    <Controller
                      name="ethnicity_other_hispanic_indicator"
                      control={control}
                      render={({ field: f }) => (
                        <div>
                          <Checkbox
                            label="Other Hispanic or Latino"
                            name="ethnicity_other_hispanic"
                            checked={f.value}
                            onChange={wrapChange(f)}
                          />
                          {f.value && (
                            <div className="ml-8 mt-2 max-w-xs">
                              <Input
                                label="Please specify"
                                name="ethnicity_other_hispanic_description"
                                value={watchedValues.ethnicity_other_hispanic_description ?? ""}
                                onChange={(e) => {
                                  (control.register("ethnicity_other_hispanic_description").onChange as unknown as (e: React.ChangeEvent<HTMLInputElement>) => void)(e);
                                  autoSave();
                                }}
                                placeholder="Enter Hispanic / Latino origin"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    />
                  </div>
                )}
              </div>
            )}
          />

          <Controller
            name="ethnicity_not_hispanic_indicator"
            control={control}
            render={({ field }) => (
              <Checkbox
                label="Not Hispanic or Latino"
                name="ethnicity_not_hispanic"
                checked={field.value === true}
                onChange={(checked) => { field.onChange(checked ? true : undefined); autoSave(); }}
              />
            )}
          />

          <Controller
            name="ethnicity_not_provided_indicator"
            control={control}
            render={({ field }) => (
              <Checkbox
                label="I do not wish to provide this information"
                name="ethnicity_not_provided"
                checked={field.value}
                onChange={wrapChange(field)}
              />
            )}
          />
        </div>
      </FormSection>

      {/* Sex */}
      <FormSection title="Sex" description="Check one.">
        <div className="space-y-3">
          <Controller
            name="sex_female_indicator"
            control={control}
            render={({ field }) => (
              <Checkbox
                label="Female"
                name="sex_female"
                checked={field.value === true}
                onChange={(checked) => { field.onChange(checked ? true : undefined); autoSave(); }}
              />
            )}
          />
          <Controller
            name="sex_male_indicator"
            control={control}
            render={({ field }) => (
              <Checkbox
                label="Male"
                name="sex_male"
                checked={field.value === true}
                onChange={(checked) => { field.onChange(checked ? true : undefined); autoSave(); }}
              />
            )}
          />
          <Controller
            name="sex_not_provided_indicator"
            control={control}
            render={({ field }) => (
              <Checkbox
                label="I do not wish to provide this information"
                name="sex_not_provided"
                checked={field.value}
                onChange={wrapChange(field)}
              />
            )}
          />
        </div>
      </FormSection>

      {/* Race */}
      <FormSection title="Race" description="Check one or more that apply.">
        <div className="space-y-4">
          {/* American Indian */}
          <div>
            <Controller
              name="race_american_indian_indicator"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label="American Indian or Alaska Native"
                  name="race_american_indian"
                  checked={field.value}
                  onChange={wrapChange(field)}
                />
              )}
            />
            {watchedValues.race_american_indian_indicator && (
              <div className="ml-8 mt-2 max-w-xs">
                <Input
                  label="Name of enrolled or principal tribe"
                  name="race_american_indian_tribe_name"
                  value={watchedValues.race_american_indian_tribe_name ?? ""}
                  onChange={(e) => {
                    (control.register("race_american_indian_tribe_name").onChange as unknown as (e: React.ChangeEvent<HTMLInputElement>) => void)(e);
                    autoSave();
                  }}
                />
              </div>
            )}
          </div>

          {/* Asian */}
          <div>
            <Controller
              name="race_asian_indicator"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label="Asian"
                  name="race_asian"
                  checked={field.value}
                  onChange={wrapChange(field)}
                />
              )}
            />
            {watchedValues.race_asian_indicator && (
              <div className="ml-8 mt-2 grid grid-cols-2 gap-2">
                {(
                  [
                    ["race_asian_indian_indicator", "Asian Indian"],
                    ["race_chinese_indicator", "Chinese"],
                    ["race_filipino_indicator", "Filipino"],
                    ["race_japanese_indicator", "Japanese"],
                    ["race_korean_indicator", "Korean"],
                    ["race_vietnamese_indicator", "Vietnamese"],
                  ] as const
                ).map(([fieldName, label]) => (
                  <Controller
                    key={fieldName}
                    name={fieldName}
                    control={control}
                    render={({ field: f }) => (
                      <Checkbox
                        label={label}
                        name={fieldName}
                        checked={f.value}
                        onChange={wrapChange(f)}
                      />
                    )}
                  />
                ))}
                <Controller
                  name="race_other_asian_indicator"
                  control={control}
                  render={({ field: f }) => (
                    <div className="col-span-2">
                      <Checkbox
                        label="Other Asian"
                        name="race_other_asian"
                        checked={f.value}
                        onChange={wrapChange(f)}
                      />
                      {f.value && (
                        <div className="ml-8 mt-2 max-w-xs">
                          <Input
                            label="Please specify"
                            name="race_other_asian_description"
                            value={watchedValues.race_other_asian_description ?? ""}
                            onChange={(e) => {
                              (control.register("race_other_asian_description").onChange as unknown as (e: React.ChangeEvent<HTMLInputElement>) => void)(e);
                              autoSave();
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                />
              </div>
            )}
          </div>

          {/* Black */}
          <Controller
            name="race_black_african_american_indicator"
            control={control}
            render={({ field }) => (
              <Checkbox
                label="Black or African American"
                name="race_black"
                checked={field.value}
                onChange={wrapChange(field)}
              />
            )}
          />

          {/* Native Hawaiian / Pacific Islander */}
          <div>
            <Controller
              name="race_native_hawaiian_indicator"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label="Native Hawaiian or Other Pacific Islander"
                  name="race_native_hawaiian"
                  checked={field.value}
                  onChange={wrapChange(field)}
                />
              )}
            />
            {watchedValues.race_native_hawaiian_indicator && (
              <div className="ml-8 mt-2 grid grid-cols-2 gap-2">
                {(
                  [
                    ["race_guamanian_chamorro_indicator", "Guamanian or Chamorro"],
                    ["race_samoan_indicator", "Samoan"],
                  ] as const
                ).map(([fieldName, label]) => (
                  <Controller
                    key={fieldName}
                    name={fieldName}
                    control={control}
                    render={({ field: f }) => (
                      <Checkbox
                        label={label}
                        name={fieldName}
                        checked={f.value}
                        onChange={wrapChange(f)}
                      />
                    )}
                  />
                ))}
                <Controller
                  name="race_other_pacific_islander_indicator"
                  control={control}
                  render={({ field: f }) => (
                    <div className="col-span-2">
                      <Checkbox
                        label="Other Pacific Islander"
                        name="race_other_pacific"
                        checked={f.value}
                        onChange={wrapChange(f)}
                      />
                      {f.value && (
                        <div className="ml-8 mt-2 max-w-xs">
                          <Input
                            label="Please specify"
                            name="race_other_pacific_description"
                            value={watchedValues.race_other_pacific_islander_description ?? ""}
                            onChange={(e) => {
                              (control.register("race_other_pacific_islander_description").onChange as unknown as (e: React.ChangeEvent<HTMLInputElement>) => void)(e);
                              autoSave();
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                />
              </div>
            )}
          </div>

          {/* White */}
          <Controller
            name="race_white_indicator"
            control={control}
            render={({ field }) => (
              <Checkbox
                label="White"
                name="race_white"
                checked={field.value}
                onChange={wrapChange(field)}
              />
            )}
          />

          {/* Not provided */}
          <Controller
            name="race_not_provided_indicator"
            control={control}
            render={({ field }) => (
              <Checkbox
                label="I do not wish to provide this information"
                name="race_not_provided"
                checked={field.value}
                onChange={wrapChange(field)}
              />
            )}
          />
        </div>
      </FormSection>

      {/* Loan officer note */}
      <p className="text-xs text-neutral-500 italic">
        Note: The Loan Officer is required to note ethnicity, sex, and race on the basis of
        visual observation or surname if you choose not to provide this information. The Loan
        Officer's observations will be used only if you do not provide the information.
      </p>
    </div>
  );
};

export default Section8Demographics;

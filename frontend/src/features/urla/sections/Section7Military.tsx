import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { Info } from "lucide-react";
import {
  RadioGroup,
  Select,
  DateInput,
  FormSection,
  Checkbox,
} from "@/design-system/components";
import type { FullBorrower } from "@/types/urla";
import type { UseURLAFormReturn } from "../hooks/useURLAForm";

interface Section7Props {
  borrower: FullBorrower | undefined;
  formHook: UseURLAFormReturn;
}

interface MilitaryFormValues {
  did_serve: string; // "yes" | "no" | ""
  active_duty: boolean;
  retired_discharged_separated: boolean;
  surviving_spouse: boolean;
  scra: boolean;
  branch: string;
  service_start_date: string;
  service_end_date: string;
  expiration_date_of_service: string;
}

const BRANCH_OPTIONS = [
  { value: "Army", label: "Army" },
  { value: "Navy", label: "Navy" },
  { value: "AirForce", label: "Air Force" },
  { value: "Marines", label: "Marine Corps" },
  { value: "CoastGuard", label: "Coast Guard" },
  { value: "SpaceForce", label: "Space Force" },
  { value: "NationalGuard", label: "National Guard" },
  { value: "Reserves", label: "Reserves" },
];

const DID_SERVE_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export const Section7Military: React.FC<Section7Props> = ({
  borrower,
  formHook,
}) => {
  const { saveMilitaryService, triggerAutoSave } = formHook;
  const ms = borrower?.military_service;

  const { control, watch, reset } = useForm<MilitaryFormValues>({
    defaultValues: {
      did_serve: ms?.did_serve_indicator ? "yes" : ms ? "no" : "",
      active_duty: ms?.active_duty_indicator ?? false,
      retired_discharged_separated: ms?.retired_discharged_separated_indicator ?? false,
      surviving_spouse: ms?.surviving_spouse_indicator ?? false,
      scra: ms?.scra_indicator ?? false,
      branch: ms?.branch_of_service_type ?? "",
      service_start_date: ms?.service_start_date ?? "",
      service_end_date: ms?.service_end_date ?? "",
      expiration_date_of_service: ms?.expiration_date_of_service ?? "",
    },
  });

  useEffect(() => {
    if (ms) {
      reset({
        did_serve: ms.did_serve_indicator ? "yes" : "no",
        active_duty: ms.active_duty_indicator,
        retired_discharged_separated: ms.retired_discharged_separated_indicator,
        surviving_spouse: ms.surviving_spouse_indicator,
        scra: ms.scra_indicator,
        branch: ms.branch_of_service_type ?? "",
        service_start_date: ms.service_start_date ?? "",
        service_end_date: ms.service_end_date ?? "",
        expiration_date_of_service: ms.expiration_date_of_service ?? "",
      });
    }
  }, [ms, reset]);

  const watchedValues = watch();
  const didServe = watchedValues.did_serve === "yes";
  const isActiveDuty = watchedValues.active_duty;

  const autoSave = (values: MilitaryFormValues) => {
    triggerAutoSave(() =>
      saveMilitaryService({
        did_serve_indicator: values.did_serve === "yes",
        active_duty_indicator: values.active_duty,
        retired_discharged_separated_indicator: values.retired_discharged_separated,
        surviving_spouse_indicator: values.surviving_spouse,
        scra_indicator: values.scra,
        branch_of_service_type: values.branch || undefined,
        service_start_date: values.service_start_date || undefined,
        service_end_date: values.service_end_date || undefined,
        expiration_date_of_service: values.expiration_date_of_service || undefined,
      })
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-neutral-900">
          Section 7: Military Service
        </h2>
        <p className="text-sm text-neutral-600 mt-1">
          This information helps determine eligibility for VA loan programs and
          SCRA protections.
        </p>
      </div>

      <FormSection title="Military Service History" isComplete={Boolean(ms)}>
        <Controller
          name="did_serve"
          control={control}
          render={({ field }) => (
            <RadioGroup
              label="Did you (or your deceased spouse) ever serve in the U.S. Armed Forces, or are you currently on active duty?"
              name="did_serve"
              value={field.value}
              onChange={(val) => {
                field.onChange(val);
                autoSave({ ...watchedValues, did_serve: val });
              }}
              options={DID_SERVE_OPTIONS}
              required
              layout="horizontal"
            />
          )}
        />

        {didServe && (
          <>
            <div>
              <p className="text-sm font-medium text-neutral-800 mb-3">
                Service type (check all that apply):
              </p>
              <div className="space-y-3">
                <div className="flex flex-col gap-3">
                  <Controller
                    name="active_duty"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        label="Currently serving on active duty"
                        name="active_duty"
                        checked={field.value}
                        onChange={(val) => {
                          field.onChange(val);
                          autoSave({ ...watchedValues, active_duty: val });
                        }}
                      />
                    )}
                  />

                  {isActiveDuty && (
                    <div className="ml-8 max-w-xs">
                      <Controller
                        name="expiration_date_of_service"
                        control={control}
                        render={({ field }) => (
                          <DateInput
                            label="Projected expiration date of active duty service"
                            name="expiration_date_of_service"
                            value={field.value}
                            onChange={(val) => {
                              field.onChange(val);
                              autoSave({ ...watchedValues, expiration_date_of_service: val });
                            }}
                          />
                        )}
                      />
                    </div>
                  )}

                  <Controller
                    name="retired_discharged_separated"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        label="Currently retired, discharged, or separated from service"
                        name="retired_discharged_separated"
                        checked={field.value}
                        onChange={(val) => {
                          field.onChange(val);
                          autoSave({ ...watchedValues, retired_discharged_separated: val });
                        }}
                      />
                    )}
                  />

                  <Controller
                    name="surviving_spouse"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        label="Surviving spouse"
                        name="surviving_spouse"
                        checked={field.value}
                        onChange={(val) => {
                          field.onChange(val);
                          autoSave({ ...watchedValues, surviving_spouse: val });
                        }}
                      />
                    )}
                  />

                  <Controller
                    name="scra"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        label="Covered by the Servicemembers Civil Relief Act (SCRA)"
                        name="scra"
                        checked={field.value}
                        onChange={(val) => {
                          field.onChange(val);
                          autoSave({ ...watchedValues, scra: val });
                        }}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="max-w-xs">
              <Controller
                name="branch"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Branch of Service"
                    name="branch"
                    value={field.value}
                    onChange={(val) => {
                      field.onChange(val);
                      autoSave({ ...watchedValues, branch: val });
                    }}
                    options={BRANCH_OPTIONS}
                    placeholder="Select branch..."
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
              <Controller
                name="service_start_date"
                control={control}
                render={({ field }) => (
                  <DateInput
                    label="Service Start Date"
                    name="service_start_date"
                    value={field.value}
                    onChange={(val) => {
                      field.onChange(val);
                      autoSave({ ...watchedValues, service_start_date: val });
                    }}
                  />
                )}
              />
              {!isActiveDuty && (
                <Controller
                  name="service_end_date"
                  control={control}
                  render={({ field }) => (
                    <DateInput
                      label="Service End Date"
                      name="service_end_date"
                      value={field.value}
                      onChange={(val) => {
                        field.onChange(val);
                        autoSave({ ...watchedValues, service_end_date: val });
                      }}
                    />
                  )}
                />
              )}
            </div>

            {/* SCRA notice */}
            <div
              className="flex items-start gap-3 p-4 bg-primary-50 border border-primary-200 rounded-lg"
              role="note"
              aria-label="SCRA information"
            >
              <Info
                className="w-5 h-5 text-primary-600 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="text-sm text-primary-800">
                <p className="font-semibold mb-1">
                  Servicemembers Civil Relief Act (SCRA)
                </p>
                <p>
                  The SCRA provides important protections for active-duty servicemembers,
                  including the right to cap interest rates at 6% on pre-service
                  obligations, protection from foreclosure, and other benefits.
                  If you are covered by SCRA, please inform your loan officer.
                </p>
              </div>
            </div>
          </>
        )}
      </FormSection>
    </div>
  );
};

export default Section7Military;

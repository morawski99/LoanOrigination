import React from "react";
import { clsx } from "clsx";
import { Check } from "lucide-react";

export type StepStatus = "complete" | "current" | "upcoming";

export interface Step {
  id: string;
  label: string;
  status: StepStatus;
}

export interface StepProgressProps {
  steps: Step[];
  onStepClick?: (stepId: string) => void;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  steps,
  onStepClick,
}) => {
  const currentIndex = steps.findIndex((s) => s.status === "current");
  const currentStep = steps[currentIndex];
  const totalSteps = steps.length;

  return (
    <>
      {/* Desktop: horizontal step indicator */}
      <nav
        aria-label="Form progress"
        className="hidden sm:block"
      >
        <ol className="flex items-center" role="list">
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            const isClickable = Boolean(onStepClick) && step.status !== "upcoming";

            return (
              <li
                key={step.id}
                className="flex items-center"
                aria-current={step.status === "current" ? "step" : undefined}
              >
                {/* Step circle + label */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    disabled={!isClickable}
                    onClick={isClickable ? () => onStepClick!(step.id) : undefined}
                    aria-label={`${step.label}${step.status === "complete" ? " (complete)" : step.status === "current" ? " (current)" : " (upcoming)"}`}
                    className={clsx(
                      "w-9 h-9 rounded-full flex items-center justify-center",
                      "text-sm font-semibold border-2 transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2",
                      step.status === "complete"
                        ? "bg-primary-600 border-primary-600 text-white"
                        : step.status === "current"
                        ? "bg-white border-primary-600 text-primary-600"
                        : "bg-white border-neutral-300 text-neutral-400",
                      isClickable ? "cursor-pointer hover:scale-105" : "cursor-default"
                    )}
                  >
                    {step.status === "complete" ? (
                      <Check className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <span aria-hidden="true">{idx + 1}</span>
                    )}
                  </button>
                  <span
                    className={clsx(
                      "text-xs mt-1.5 font-medium whitespace-nowrap",
                      step.status === "current"
                        ? "text-primary-700"
                        : step.status === "complete"
                        ? "text-primary-600"
                        : "text-neutral-400"
                    )}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div
                    className={clsx(
                      "h-0.5 w-12 mx-2 mb-5 transition-colors duration-200",
                      step.status === "complete" ? "bg-primary-600" : "bg-neutral-200"
                    )}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Mobile: collapsed step indicator */}
      <div
        className="sm:hidden flex items-center gap-2 py-2"
        aria-label="Form progress"
        role="navigation"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-600 text-white text-sm font-semibold shrink-0"
          aria-hidden="true"
        >
          {currentIndex + 1}
        </div>
        <div>
          <p className="text-xs text-neutral-500">
            Step {currentIndex + 1} of {totalSteps}
          </p>
          <p className="text-sm font-semibold text-neutral-900">
            {currentStep?.label ?? ""}
          </p>
        </div>
        {/* Mini progress bar */}
        <div className="flex-1 h-1.5 bg-neutral-200 rounded-full ml-2" aria-hidden="true">
          <div
            className="h-full bg-primary-600 rounded-full transition-all duration-300"
            style={{
              width: `${Math.round(
                (steps.filter((s) => s.status === "complete").length / totalSteps) * 100
              )}%`,
            }}
          />
        </div>
      </div>
    </>
  );
};

export default StepProgress;

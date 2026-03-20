import React, { useId } from "react";
import { clsx } from "clsx";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

export interface RadioGroupProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  error?: string;
  required?: boolean;
  layout?: "horizontal" | "vertical";
  disabled?: boolean;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  name,
  value,
  onChange,
  options,
  error,
  required = false,
  layout = "vertical",
  disabled = false,
}) => {
  const generatedId = useId();
  const groupId = `radiogroup-${name}-${generatedId}`;
  const errorId = `${groupId}-error`;
  const hasError = Boolean(error);

  return (
    <fieldset
      className="w-full"
      aria-required={required}
      aria-describedby={hasError ? errorId : undefined}
    >
      <legend className="text-sm font-medium text-neutral-800 mb-2">
        {label}
        {required && (
          <span className="text-error ml-0.5" aria-label="required" aria-hidden="false">
            *
          </span>
        )}
      </legend>

      <div
        className={clsx(
          "flex gap-3",
          layout === "vertical" ? "flex-col" : "flex-row flex-wrap"
        )}
        role="radiogroup"
        aria-labelledby={groupId}
      >
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`;
          const isSelected = value === option.value;

          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={clsx(
                "flex items-start gap-3 min-h-[48px] px-4 py-3 rounded border-2 cursor-pointer",
                "transition-all duration-150",
                isSelected
                  ? "border-primary-600 bg-primary-50"
                  : "border-neutral-200 bg-white hover:border-primary-300",
                disabled && "opacity-60 cursor-not-allowed",
                hasError && !isSelected && "border-error/40"
              )}
            >
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                className={clsx(
                  "mt-0.5 h-4 w-4 shrink-0",
                  "accent-primary-600",
                  "focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
                )}
                aria-describedby={option.description ? `${optionId}-desc` : undefined}
              />
              <div className="flex flex-col">
                <span
                  className={clsx(
                    "text-sm font-medium",
                    isSelected ? "text-primary-800" : "text-neutral-900"
                  )}
                >
                  {option.label}
                </span>
                {option.description && (
                  <span
                    id={`${optionId}-desc`}
                    className="text-xs text-neutral-500 mt-0.5"
                  >
                    {option.description}
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {hasError && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-sm text-error flex items-center gap-1 mt-1.5"
        >
          <span aria-hidden="true">⚠</span>
          {error}
        </p>
      )}
    </fieldset>
  );
};

export default RadioGroup;

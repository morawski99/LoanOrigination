import React, { useId } from "react";
import { clsx } from "clsx";

export interface CheckboxProps {
  label: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  disabled?: boolean;
  description?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  name,
  checked,
  onChange,
  error,
  disabled = false,
  description,
}) => {
  const generatedId = useId();
  const checkboxId = `checkbox-${name}-${generatedId}`;
  const errorId = `${checkboxId}-error`;
  const descriptionId = `${checkboxId}-desc`;
  const hasError = Boolean(error);

  const describedBy = [
    description ? descriptionId : null,
    hasError ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-3 min-h-[48px] py-2">
        {/* Custom checkbox */}
        <div className="relative flex shrink-0 mt-0.5">
          <input
            id={checkboxId}
            type="checkbox"
            name={name}
            checked={checked}
            disabled={disabled}
            aria-checked={checked}
            aria-describedby={describedBy || undefined}
            aria-invalid={hasError}
            onChange={(e) => onChange(e.target.checked)}
            className={clsx(
              "h-5 w-5 rounded appearance-none border-2 cursor-pointer",
              "transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2",
              checked
                ? "bg-primary-600 border-primary-600"
                : hasError
                ? "bg-white border-error"
                : "bg-white border-neutral-400 hover:border-primary-500",
              disabled && "opacity-60 cursor-not-allowed"
            )}
          />
          {/* Checkmark icon */}
          {checked && (
            <svg
              className="absolute inset-0 w-5 h-5 text-white pointer-events-none"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>

        <label
          htmlFor={checkboxId}
          className={clsx(
            "text-sm font-medium cursor-pointer select-none",
            disabled ? "text-neutral-500" : "text-neutral-800"
          )}
        >
          {label}
          {description && (
            <span
              id={descriptionId}
              className="block text-xs font-normal text-neutral-500 mt-0.5"
            >
              {description}
            </span>
          )}
        </label>
      </div>

      {hasError && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-sm text-error flex items-center gap-1 ml-8"
        >
          <span aria-hidden="true">⚠</span>
          {error}
        </p>
      )}
    </div>
  );
};

export default Checkbox;

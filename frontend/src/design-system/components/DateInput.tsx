import React, { useId } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface DateInputProps {
  label: string;
  name: string;
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  maxDate?: string; // YYYY-MM-DD
  minDate?: string; // YYYY-MM-DD
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      label,
      name,
      value,
      onChange,
      error,
      required = false,
      disabled = false,
      helperText,
      maxDate,
      minDate,
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = `date-${name}-${generatedId}`;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const hasError = Boolean(error);
    const describedBy = [
      hasError ? errorId : null,
      helperText && !hasError ? helperId : null,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {/* Label */}
        <label
          htmlFor={inputId}
          className={clsx(
            "text-sm font-medium leading-none",
            disabled ? "text-neutral-500" : "text-neutral-800"
          )}
        >
          {label}
          {required && (
            <span className="text-error ml-0.5" aria-label="required" aria-hidden="false">
              *
            </span>
          )}
        </label>

        {/* Date input */}
        <input
          ref={ref}
          id={inputId}
          name={name}
          type="date"
          value={value}
          disabled={disabled}
          required={required}
          min={minDate}
          max={maxDate}
          aria-required={required}
          aria-invalid={hasError}
          aria-describedby={describedBy || undefined}
          onChange={(e) => onChange(e.target.value)}
          className={twMerge(
            clsx(
              "w-full h-12 px-3 rounded",
              "text-base text-neutral-900",
              "bg-white border",
              "transition-colors duration-150 ease-in-out",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
              "[&::-webkit-calendar-picker-indicator]:opacity-60",
              "[&::-webkit-calendar-picker-indicator]:hover:opacity-100",
              hasError
                ? "border-error focus:border-error focus:ring-error/30"
                : "border-neutral-300 focus:border-primary-600 focus:ring-primary-600/20",
              disabled && "bg-neutral-100 text-neutral-500 cursor-not-allowed"
            )
          )}
        />

        {/* Error message */}
        {hasError && (
          <p
            id={errorId}
            role="alert"
            aria-live="polite"
            className="text-sm text-error flex items-center gap-1"
          >
            <span aria-hidden="true">⚠</span>
            {error}
          </p>
        )}

        {/* Helper text */}
        {helperText && !hasError && (
          <p id={helperId} className="text-xs text-neutral-600">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

DateInput.displayName = "DateInput";

export default DateInput;

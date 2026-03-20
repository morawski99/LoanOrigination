import React, { useId, useState, useCallback } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface CurrencyInputProps {
  label: string;
  name: string;
  value: string | number | null | undefined;
  onChange: (rawValue: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  placeholder?: string;
}

function formatWithCommas(value: string): string {
  const digits = value.replace(/[^0-9.]/g, "");
  const parts = digits.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0];
}

function stripFormatting(value: string): string {
  return value.replace(/,/g, "");
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
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
      placeholder = "0.00",
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = `currency-${name}-${generatedId}`;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const prefixId = `${inputId}-prefix`;

    const hasError = Boolean(error);
    const describedBy = [
      prefixId,
      hasError ? errorId : null,
      helperText && !hasError ? helperId : null,
    ]
      .filter(Boolean)
      .join(" ");

    // Display value: formatted when not focused, raw when focused
    const [isFocused, setIsFocused] = useState(false);

    const rawValue = value !== null && value !== undefined ? String(value) : "";
    const displayValue = isFocused
      ? stripFormatting(rawValue)
      : rawValue
      ? formatWithCommas(stripFormatting(rawValue))
      : "";

    const handleFocus = useCallback(() => {
      setIsFocused(true);
    }, []);

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        const stripped = stripFormatting(e.target.value);
        onChange(stripped);
      },
      [onChange]
    );

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/[^0-9.]/g, "");
        onChange(raw);
      },
      [onChange]
    );

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

        {/* Input wrapper */}
        <div className="relative flex items-center">
          {/* Dollar prefix */}
          <div
            id={prefixId}
            aria-hidden="true"
            className={clsx(
              "absolute left-0 inset-y-0 flex items-center pl-3 pointer-events-none",
              "text-base font-medium",
              disabled ? "text-neutral-400" : "text-neutral-700"
            )}
          >
            $
          </div>

          <input
            ref={ref}
            id={inputId}
            name={name}
            type="text"
            inputMode="decimal"
            disabled={disabled}
            required={required}
            placeholder={placeholder}
            value={displayValue}
            aria-required={required}
            aria-invalid={hasError}
            aria-describedby={describedBy}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            className={twMerge(
              clsx(
                "w-full h-12 pl-7 pr-3 rounded text-right",
                "text-base text-neutral-900 font-medium",
                "bg-white border",
                "transition-colors duration-150 ease-in-out",
                "placeholder:text-neutral-400 placeholder:font-normal",
                "focus:outline-none focus:ring-2 focus:ring-offset-0",
                hasError
                  ? "border-error focus:border-error focus:ring-error/30"
                  : "border-neutral-300 focus:border-primary-600 focus:ring-primary-600/20",
                disabled && "bg-neutral-100 text-neutral-500 cursor-not-allowed"
              )
            )}
          />
        </div>

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

CurrencyInput.displayName = "CurrencyInput";

export default CurrencyInput;

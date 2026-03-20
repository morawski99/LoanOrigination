import React, { useId, useCallback } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface PhoneInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

function formatPhone(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function stripPhone(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      label,
      name,
      value,
      onChange,
      error,
      required = false,
      disabled = false,
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = `phone-${name}-${generatedId}`;
    const errorId = `${inputId}-error`;
    const hasError = Boolean(error);

    // value stored as digits, displayed formatted
    const digits = stripPhone(value || "");
    const displayValue = formatPhone(digits);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = stripPhone(e.target.value);
        onChange(raw);
      },
      [onChange]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Allow: backspace, delete, tab, escape, enter
        const allowed = [
          "Backspace",
          "Delete",
          "Tab",
          "Escape",
          "Enter",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
        ];
        if (allowed.includes(e.key)) return;
        // Allow Ctrl/Cmd combinations
        if (e.ctrlKey || e.metaKey) return;
        // Only allow digits
        if (!/^\d$/.test(e.key)) {
          e.preventDefault();
        }
      },
      []
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

        {/* Input */}
        <input
          ref={ref}
          id={inputId}
          name={name}
          type="tel"
          inputMode="numeric"
          value={displayValue}
          disabled={disabled}
          required={required}
          maxLength={14} // (XXX) XXX-XXXX
          placeholder="(XXX) XXX-XXXX"
          aria-required={required}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={twMerge(
            clsx(
              "w-full h-12 px-3 rounded",
              "text-base text-neutral-900 font-normal",
              "bg-white border",
              "transition-colors duration-150 ease-in-out",
              "placeholder:text-neutral-400",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
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
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export default PhoneInput;

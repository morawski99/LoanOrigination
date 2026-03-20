import React, { useId, useState, useCallback } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Eye, EyeOff, Lock } from "lucide-react";

export interface SSNInputProps {
  label: string;
  name: string;
  value: string; // 9 digit string, never logged
  onChange: (digits: string) => void;
  error?: string;
  required?: boolean;
}

function maskSSN(digits: string): string {
  const d = digits.slice(0, 9);
  // Format as XXX-XX-XXXX with masking
  if (d.length === 0) return "";
  if (d.length <= 3) return "•".repeat(d.length);
  if (d.length <= 5) return `•••-${"•".repeat(d.length - 3)}`;
  return `•••-••-${d.slice(5)}`;
}

function formatSSNVisible(digits: string): string {
  const d = digits.slice(0, 9);
  if (d.length === 0) return "";
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

export const SSNInput = React.forwardRef<HTMLInputElement, SSNInputProps>(
  ({ label, name, value, onChange, error, required = false }, ref) => {
    const generatedId = useId();
    const inputId = `ssn-${name}-${generatedId}`;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const hasError = Boolean(error);

    const [showSSN, setShowSSN] = useState(false);
    const digits = (value || "").replace(/\D/g, "").slice(0, 9);

    const displayValue = showSSN ? formatSSNVisible(digits) : maskSSN(digits);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, "").slice(0, 9);
        onChange(raw);
      },
      [onChange]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        const allowed = [
          "Backspace",
          "Delete",
          "Tab",
          "Escape",
          "Enter",
          "ArrowLeft",
          "ArrowRight",
        ];
        if (allowed.includes(e.key)) return;
        if (e.ctrlKey || e.metaKey) return;
        if (!/^\d$/.test(e.key)) {
          e.preventDefault();
        }
      },
      []
    );

    const describedBy = [
      hasError ? errorId : null,
      helperId,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {/* Label */}
        <label
          htmlFor={inputId}
          className="text-sm font-medium leading-none text-neutral-800"
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
          <input
            ref={ref}
            id={inputId}
            name={name}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={displayValue}
            required={required}
            maxLength={11} // XXX-XX-XXXX
            placeholder="•••-••-••••"
            aria-required={required}
            aria-invalid={hasError}
            aria-describedby={describedBy}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className={twMerge(
              clsx(
                "w-full h-12 pl-3 pr-10 rounded",
                "text-base text-neutral-900 font-mono tracking-wider",
                "bg-white border",
                "transition-colors duration-150 ease-in-out",
                "placeholder:font-sans placeholder:tracking-normal placeholder:text-neutral-400",
                "focus:outline-none focus:ring-2 focus:ring-offset-0",
                hasError
                  ? "border-error focus:border-error focus:ring-error/30"
                  : "border-neutral-300 focus:border-primary-600 focus:ring-primary-600/20"
              )
            )}
          />

          {/* Show/hide toggle */}
          <button
            type="button"
            aria-label={showSSN ? "Hide SSN" : "Show SSN"}
            onClick={() => setShowSSN((prev) => !prev)}
            className={clsx(
              "absolute right-3 inset-y-0 flex items-center",
              "text-neutral-500 hover:text-neutral-700",
              "focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1 rounded"
            )}
          >
            {showSSN ? (
              <EyeOff className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Eye className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
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

        {/* Security helper text — always shown */}
        <p id={helperId} className="text-xs text-neutral-600 flex items-center gap-1">
          <Lock className="w-3 h-3" aria-hidden="true" />
          This is encrypted and secured. Your SSN is never stored in plaintext.
        </p>
      </div>
    );
  }
);

SSNInput.displayName = "SSNInput";

export default SSNInput;

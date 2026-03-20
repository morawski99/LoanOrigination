import React, { useId } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id" | "onChange"> {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  error?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      name,
      value,
      onChange,
      options,
      error,
      required = false,
      disabled = false,
      helperText,
      placeholder,
      className,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = `select-${name}-${generatedId}`;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

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
          htmlFor={selectId}
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

        {/* Select wrapper */}
        <div className="relative w-full">
          <select
            ref={ref}
            id={selectId}
            name={name}
            value={value}
            disabled={disabled}
            required={required}
            aria-required={required}
            aria-invalid={hasError}
            aria-describedby={describedBy || undefined}
            onChange={(e) => onChange(e.target.value)}
            className={twMerge(
              clsx(
                "w-full h-12 pl-3 pr-10 rounded appearance-none",
                "text-base font-normal",
                "bg-white border",
                "transition-colors duration-150 ease-in-out",
                "focus:outline-none focus:ring-2 focus:ring-offset-0",
                "cursor-pointer",
                hasError
                  ? "border-error text-neutral-900 focus:border-error focus:ring-error/30"
                  : "border-neutral-300 focus:border-primary-600 focus:ring-primary-600/20",
                disabled && "bg-neutral-100 text-neutral-500 cursor-not-allowed",
                !value && "text-neutral-400",
                className
              )
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Custom chevron */}
          <div
            className={clsx(
              "pointer-events-none absolute inset-y-0 right-3 flex items-center",
              disabled ? "text-neutral-400" : "text-neutral-600"
            )}
            aria-hidden="true"
          >
            <ChevronDown className="w-4 h-4" />
          </div>
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

Select.displayName = "Select";

export default Select;

import React, { useId } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  name: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      name,
      type = "text",
      error,
      helperText,
      required = false,
      disabled = false,
      className,
      placeholder,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = `input-${name}-${generatedId}`;
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
            <span
              className="text-error ml-0.5"
              aria-label="required"
              aria-hidden="false"
            >
              *
            </span>
          )}
        </label>

        {/* Input */}
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          aria-required={required}
          aria-invalid={hasError}
          aria-describedby={describedBy || undefined}
          className={twMerge(
            clsx(
              // Layout
              "w-full h-12 px-3 rounded",
              // Typography
              "text-base text-neutral-900 font-normal",
              // Background and border
              "bg-white border",
              "transition-colors duration-150 ease-in-out",
              // Placeholder
              "placeholder:text-neutral-400",
              // Focus
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              // Default border
              hasError
                ? "border-error focus:border-error focus:ring-error/30"
                : "border-neutral-300 focus:border-primary-600 focus:ring-primary-600/20",
              // Disabled state
              disabled && "bg-neutral-100 text-neutral-500 cursor-not-allowed",
              className
            )
          )}
          {...props}
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

        {/* Helper text (only shown when no error) */}
        {helperText && !hasError && (
          <p id={helperId} className="text-xs text-neutral-600">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;

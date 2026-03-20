import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    "bg-primary-600 text-white",
    "hover:bg-primary-700",
    "focus-visible:ring-primary-500",
    "active:bg-primary-800",
    "disabled:bg-neutral-300 disabled:text-neutral-500",
  ].join(" "),
  secondary: [
    "border-2 border-primary-600 text-primary-600 bg-transparent",
    "hover:bg-primary-100",
    "focus-visible:ring-primary-500",
    "active:bg-primary-200",
    "disabled:border-neutral-300 disabled:text-neutral-400",
  ].join(" "),
  ghost: [
    "text-primary-600 bg-transparent",
    "hover:bg-primary-100",
    "focus-visible:ring-primary-500",
    "active:bg-primary-200",
    "disabled:text-neutral-400",
  ].join(" "),
  danger: [
    "bg-error text-white",
    "hover:bg-red-700",
    "focus-visible:ring-red-400",
    "active:bg-red-800",
    "disabled:bg-neutral-300 disabled:text-neutral-500",
  ].join(" "),
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-[36px] px-3 py-1.5 text-sm gap-1.5",
  md: "min-h-[48px] px-4 py-2.5 text-sm gap-2",
  lg: "min-h-[52px] px-6 py-3 text-base gap-2",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      className,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isLoading}
        className={twMerge(
          clsx(
            // Base styles
            "inline-flex items-center justify-center font-medium rounded",
            "transition-colors duration-150 ease-in-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            "cursor-pointer select-none",
            "disabled:cursor-not-allowed disabled:opacity-60",
            // Variant
            variantClasses[variant],
            // Size
            sizeClasses[size],
            className
          )
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2
              className="animate-spin shrink-0"
              size={size === "sm" ? 14 : size === "lg" ? 18 : 16}
              aria-hidden="true"
            />
            <span className="sr-only">Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;

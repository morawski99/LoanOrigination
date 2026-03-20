import React from "react";
import { clsx } from "clsx";
import { LoanStatus } from "@/types/loan";
import { getLoanStatusLabel, getLoanStatusColor } from "@/utils/loanStatus";

export type BadgeSize = "sm" | "md";

export interface BadgeProps {
  status: LoanStatus;
  size?: BadgeSize;
  className?: string;
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: "text-xs px-2 py-0.5 font-medium",
  md: "text-sm px-2.5 py-1 font-medium",
};

export const Badge: React.FC<BadgeProps> = ({
  status,
  size = "md",
  className,
}) => {
  const { bg, text } = getLoanStatusColor(status);
  const label = getLoanStatusLabel(status);

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full whitespace-nowrap",
        bg,
        text,
        sizeClasses[size],
        className
      )}
      aria-label={`Loan status: ${label}`}
    >
      {label}
    </span>
  );
};

export default Badge;

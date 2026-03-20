import { LoanStatus } from "@/types/loan";

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  [LoanStatus.NEW]: "New",
  [LoanStatus.IN_PROCESS]: "In Process",
  [LoanStatus.CONDITIONAL_APPROVAL]: "Conditional Approval",
  [LoanStatus.APPROVED]: "Approved",
  [LoanStatus.SUSPENDED]: "Suspended",
  [LoanStatus.DECLINED]: "Declined",
  [LoanStatus.WITHDRAWN]: "Withdrawn",
  [LoanStatus.FUNDED]: "Funded",
};

export const LOAN_STATUS_COLORS: Record<
  LoanStatus,
  { bg: string; text: string }
> = {
  [LoanStatus.NEW]: { bg: "bg-primary-100", text: "text-primary-800" },
  [LoanStatus.IN_PROCESS]: { bg: "bg-purple-100", text: "text-purple-800" },
  [LoanStatus.CONDITIONAL_APPROVAL]: {
    bg: "bg-orange-100",
    text: "text-orange-800",
  },
  [LoanStatus.APPROVED]: { bg: "bg-green-100", text: "text-green-800" },
  [LoanStatus.SUSPENDED]: { bg: "bg-yellow-100", text: "text-yellow-800" },
  [LoanStatus.DECLINED]: { bg: "bg-red-100", text: "text-red-800" },
  [LoanStatus.WITHDRAWN]: { bg: "bg-neutral-200", text: "text-neutral-700" },
  [LoanStatus.FUNDED]: { bg: "bg-emerald-100", text: "text-emerald-900" },
};

export function getLoanStatusLabel(status: LoanStatus): string {
  return LOAN_STATUS_LABELS[status] ?? status;
}

export function getLoanStatusColor(status: LoanStatus): {
  bg: string;
  text: string;
} {
  return (
    LOAN_STATUS_COLORS[status] ?? {
      bg: "bg-neutral-200",
      text: "text-neutral-700",
    }
  );
}

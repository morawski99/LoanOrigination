import { z } from "zod";
import { LiabilityType } from "@/types/urla";

export const liabilitySchema = z.object({
  liability_type: z.nativeEnum(LiabilityType, {
    errorMap: () => ({ message: "Please select a liability type" }),
  }),
  creditor_name: z.string().max(200).optional().or(z.literal("")),
  account_identifier: z.string().max(50).optional().or(z.literal("")),
  monthly_payment_amount: z
    .string()
    .optional()
    .transform((v) => (v ? parseFloat(v.replace(/,/g, "")) : undefined))
    .pipe(z.number().min(0, "Monthly payment cannot be negative").optional()),
  unpaid_balance_amount: z
    .string()
    .optional()
    .transform((v) => (v ? parseFloat(v.replace(/,/g, "")) : undefined))
    .pipe(z.number().min(0, "Balance cannot be negative").optional()),
  months_remaining: z
    .number()
    .int()
    .min(0, "Months remaining cannot be negative")
    .optional(),
  will_be_paid_off_indicator: z.boolean(),
  exclude_from_liabilities_indicator: z.boolean(),
  exclusion_reason: z
    .string()
    .max(200)
    .optional()
    .or(z.literal("")),
});

export type LiabilityFormData = z.infer<typeof liabilitySchema>;

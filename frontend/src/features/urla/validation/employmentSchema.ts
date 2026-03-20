import { z } from "zod";
import { EmploymentStatusType } from "@/types/urla";

const incomeField = z
  .string()
  .optional()
  .transform((v) => (v ? parseFloat(v.replace(/,/g, "")) : undefined))
  .pipe(z.number().min(0, "Income cannot be negative").optional());

export const employmentSchema = z
  .object({
    employment_status_type: z.nativeEnum(EmploymentStatusType, {
      errorMap: () => ({ message: "Please select an employment status" }),
    }),
    is_current: z.boolean(),
    employer_name: z.string().max(200).optional().or(z.literal("")),
    employer_address_line: z.string().max(200).optional().or(z.literal("")),
    employer_city: z.string().max(100).optional().or(z.literal("")),
    employer_state: z.string().max(2).optional().or(z.literal("")),
    employer_zip: z.string().max(10).optional().or(z.literal("")),
    employer_phone: z
      .string()
      .regex(/^\d{10}$/, "Enter a valid 10-digit phone number")
      .optional()
      .or(z.literal("")),
    position_description: z.string().max(200).optional().or(z.literal("")),
    start_date: z.string().optional().or(z.literal("")),
    end_date: z.string().optional().or(z.literal("")),
    years_in_profession: z
      .number()
      .min(0, "Cannot be negative")
      .max(60)
      .optional(),
    is_primary: z.boolean(),
    self_employed_indicator: z.boolean(),
    ownership_interest_percent: z
      .number()
      .min(0)
      .max(100)
      .optional(),
    base_income_amount: incomeField,
    overtime_income_amount: incomeField,
    bonus_income_amount: incomeField,
    commission_income_amount: incomeField,
    military_entitlements_amount: incomeField,
    other_income_amount: incomeField,
  })
  .refine(
    (data) => {
      // Employer name required if employed or self-employed
      if (
        data.employment_status_type === EmploymentStatusType.EMPLOYED ||
        data.employment_status_type === EmploymentStatusType.SELF_EMPLOYED
      ) {
        return Boolean(data.employer_name && data.employer_name.trim().length > 0);
      }
      return true;
    },
    {
      message: "Employer / business name is required",
      path: ["employer_name"],
    }
  )
  .refine(
    (data) => {
      // Start date required if employed or self-employed
      if (
        data.employment_status_type === EmploymentStatusType.EMPLOYED ||
        data.employment_status_type === EmploymentStatusType.SELF_EMPLOYED
      ) {
        return Boolean(data.start_date && data.start_date.trim().length > 0);
      }
      return true;
    },
    {
      message: "Start date is required",
      path: ["start_date"],
    }
  );

export type EmploymentFormData = z.infer<typeof employmentSchema>;

/**
 * Returns true if current employment covers at least 2 years.
 */
export function hasTwoYearEmploymentHistory(
  employments: Array<{ start_date?: string | null; is_current: boolean }>
): boolean {
  if (employments.length === 0) return false;

  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const earliest = employments
    .map((e) => (e.start_date ? new Date(e.start_date) : null))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  if (!earliest) return false;
  return earliest <= twoYearsAgo;
}

import { z } from "zod";
import { ResidencyType, HousingExpenseType } from "@/types/urla";

export const residenceSchema = z
  .object({
    residency_type: z.nativeEnum(ResidencyType, {
      errorMap: () => ({ message: "Please select a residency type" }),
    }),
    address_line: z
      .string()
      .min(5, "Street address is required")
      .max(200, "Address cannot exceed 200 characters"),
    unit_number: z.string().max(20).optional().or(z.literal("")),
    city: z
      .string()
      .min(2, "City is required")
      .max(100, "City cannot exceed 100 characters"),
    state: z
      .string()
      .length(2, "Please select a state"),
    zip: z
      .string()
      .regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code (e.g. 90210)"),
    housing_expense_type: z.nativeEnum(HousingExpenseType, {
      errorMap: () => ({ message: "Please select your housing situation" }),
    }),
    monthly_rent_amount: z
      .string()
      .optional()
      .transform((v) => (v ? parseFloat(v.replace(/,/g, "")) : undefined))
      .pipe(
        z
          .number()
          .min(0, "Rent amount cannot be negative")
          .optional()
      ),
    residency_start_date: z
      .string()
      .min(1, "Move-in date is required"),
    residency_end_date: z.string().optional().or(z.literal("")),
    is_current: z.boolean(),
  })
  .refine(
    (data) => {
      // Monthly rent is required if housing type is Rent
      if (data.housing_expense_type === HousingExpenseType.RENT) {
        return data.monthly_rent_amount !== undefined && data.monthly_rent_amount > 0;
      }
      return true;
    },
    {
      message: "Monthly rent amount is required",
      path: ["monthly_rent_amount"],
    }
  );

export type ResidenceFormData = z.infer<typeof residenceSchema>;

/**
 * Validates that residency history covers at least 2 years.
 * Returns true if coverage is sufficient, false otherwise.
 */
export function hasTwoYearResidencyHistory(
  residences: Array<{ residency_start_date?: string | null }>
): boolean {
  if (residences.length === 0) return false;

  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const earliest = residences
    .map((r) => (r.residency_start_date ? new Date(r.residency_start_date) : null))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  if (!earliest) return false;
  return earliest <= twoYearsAgo;
}

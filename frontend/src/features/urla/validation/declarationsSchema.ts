import { z } from "zod";
import { OccupancyIntentType } from "@/types/urla";

// Helper: boolean field that must be explicitly answered (not null)
const requiredBool = z
  .boolean({
    required_error: "Please answer this question",
    invalid_type_error: "Please answer this question",
  });

export const declarationsSchema = z.object({
  occupancy_intent_type: z.nativeEnum(OccupancyIntentType, {
    errorMap: () => ({ message: "Please select your occupancy intent" }),
  }),
  family_relationship_with_seller_indicator: requiredBool,
  borrowed_down_payment_indicator: requiredBool,
  applied_for_other_mortgage_indicator: requiredBool,
  apply_new_mortgage_indicator: requiredBool,
  outstanding_judgment_indicator: requiredBool,
  declared_bankruptcy_indicator: requiredBool,
  bankruptcy_type: z.string().max(50).optional().or(z.literal("")),
  foreclosure_indicator: requiredBool,
  party_to_lawsuit_indicator: requiredBool,
  federal_debt_delinquency_indicator: requiredBool,
  alimony_obligation_indicator: requiredBool,
  alimony_amount: z
    .number()
    .min(0, "Alimony amount cannot be negative")
    .optional(),
  co_signer_indicator: requiredBool,
  us_citizen_indicator: requiredBool,
  permanent_resident_alien_indicator: z.boolean().optional(),
  ownership_in_past_3_years_indicator: z.boolean().optional(),
  property_ownership_type: z.string().max(100).optional().or(z.literal("")),
});

export type DeclarationsFormData = z.infer<typeof declarationsSchema>;

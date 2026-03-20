import { z } from "zod";
import { AssetType } from "@/types/urla";

export const assetSchema = z.object({
  asset_type: z.nativeEnum(AssetType, {
    errorMap: () => ({ message: "Please select an asset type" }),
  }),
  financial_institution_name: z
    .string()
    .max(200)
    .optional()
    .or(z.literal("")),
  account_identifier: z
    .string()
    .max(50, "Account identifier cannot exceed 50 characters")
    .optional()
    .or(z.literal("")),
  current_value_amount: z
    .string()
    .min(1, "Asset value is required")
    .transform((v) => parseFloat(v.replace(/,/g, "")))
    .pipe(z.number().min(0, "Asset value cannot be negative")),
  gift_source_type: z.string().max(100).optional().or(z.literal("")),
  is_deplete_indicator: z.boolean(),
});

export type AssetFormData = z.infer<typeof assetSchema>;

import { z } from "zod";

export const demographicsSchema = z
  .object({
    // Ethnicity
    ethnicity_hispanic_latino_indicator: z.boolean().optional(),
    ethnicity_mexican_indicator: z.boolean(),
    ethnicity_puerto_rican_indicator: z.boolean(),
    ethnicity_cuban_indicator: z.boolean(),
    ethnicity_other_hispanic_indicator: z.boolean(),
    ethnicity_other_hispanic_description: z
      .string()
      .max(100)
      .optional()
      .or(z.literal("")),
    ethnicity_not_hispanic_indicator: z.boolean().optional(),
    ethnicity_not_provided_indicator: z.boolean(),

    // Race
    race_american_indian_indicator: z.boolean(),
    race_american_indian_tribe_name: z
      .string()
      .max(100)
      .optional()
      .or(z.literal("")),
    race_asian_indicator: z.boolean(),
    race_asian_indian_indicator: z.boolean(),
    race_chinese_indicator: z.boolean(),
    race_filipino_indicator: z.boolean(),
    race_japanese_indicator: z.boolean(),
    race_korean_indicator: z.boolean(),
    race_vietnamese_indicator: z.boolean(),
    race_other_asian_indicator: z.boolean(),
    race_other_asian_description: z
      .string()
      .max(100)
      .optional()
      .or(z.literal("")),
    race_black_african_american_indicator: z.boolean(),
    race_native_hawaiian_indicator: z.boolean(),
    race_guamanian_chamorro_indicator: z.boolean(),
    race_samoan_indicator: z.boolean(),
    race_other_pacific_islander_indicator: z.boolean(),
    race_other_pacific_islander_description: z
      .string()
      .max(100)
      .optional()
      .or(z.literal("")),
    race_white_indicator: z.boolean(),
    race_not_provided_indicator: z.boolean(),

    // Sex
    sex_male_indicator: z.boolean().optional(),
    sex_female_indicator: z.boolean().optional(),
    sex_not_provided_indicator: z.boolean(),
    sex_prefer_not_to_disclose: z.boolean(),

    collection_method_type: z.string().max(50).optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      // At least one ethnicity selection or not_provided
      const hasEthnicity =
        data.ethnicity_hispanic_latino_indicator === true ||
        data.ethnicity_not_hispanic_indicator === true ||
        data.ethnicity_not_provided_indicator === true;
      return hasEthnicity;
    },
    {
      message:
        "Please select at least one ethnicity or indicate you prefer not to provide this information",
      path: ["ethnicity_not_provided_indicator"],
    }
  )
  .refine(
    (data) => {
      // At least one race selection or not_provided
      const hasRace =
        data.race_american_indian_indicator ||
        data.race_asian_indicator ||
        data.race_black_african_american_indicator ||
        data.race_native_hawaiian_indicator ||
        data.race_white_indicator ||
        data.race_not_provided_indicator;
      return hasRace;
    },
    {
      message:
        "Please select at least one race or indicate you prefer not to provide this information",
      path: ["race_not_provided_indicator"],
    }
  )
  .refine(
    (data) => {
      // At least one sex selection or not_provided / prefer_not_to_disclose
      const hasSex =
        data.sex_male_indicator === true ||
        data.sex_female_indicator === true ||
        data.sex_not_provided_indicator ||
        data.sex_prefer_not_to_disclose;
      return hasSex;
    },
    {
      message: "Please select a sex option",
      path: ["sex_not_provided_indicator"],
    }
  );

export type DemographicsFormData = z.infer<typeof demographicsSchema>;

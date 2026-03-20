import { z } from "zod";
import { CitizenshipResidencyType, MaritalStatusType } from "@/types/urla";

export const personalInfoSchema = z.object({
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name cannot exceed 100 characters"),
  last_name: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name cannot exceed 100 characters"),
  middle_name: z.string().max(100).optional().or(z.literal("")),
  suffix_name: z
    .enum(["", "Jr", "Sr", "II", "III", "IV"])
    .optional(),
  email: z
    .string()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
  phone: z
    .string()
    .min(10, "Cell phone is required (10 digits)")
    .max(10, "Phone number cannot exceed 10 digits")
    .regex(/^\d{10}$/, "Enter a valid 10-digit phone number"),
  home_phone: z
    .string()
    .regex(/^\d{10}$/, "Enter a valid 10-digit phone number")
    .optional()
    .or(z.literal("")),
  work_phone: z
    .string()
    .regex(/^\d{10}$/, "Enter a valid 10-digit phone number")
    .optional()
    .or(z.literal("")),
  citizenship_residency_type: z
    .nativeEnum(CitizenshipResidencyType)
    .optional(),
  marital_status_type: z.nativeEnum(MaritalStatusType).optional(),
  number_of_dependents: z
    .number()
    .int("Number of dependents must be a whole number")
    .min(0, "Cannot be negative")
    .max(20, "Maximum 20 dependents")
    .optional(),
  dependent_ages_description: z
    .string()
    .max(100, "Description too long")
    .optional()
    .or(z.literal("")),
  dob_display: z.string().optional().or(z.literal("")),
  ssn_last4: z.string().max(4).optional().or(z.literal("")),
});

export type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;

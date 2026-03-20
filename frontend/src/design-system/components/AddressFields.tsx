import React from "react";
import { Input } from "./Input";
import { Select } from "./Select";

const US_STATES: { value: string; label: string }[] = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

export interface AddressValues {
  address_line: string;
  unit_number?: string;
  city: string;
  state: string;
  zip: string;
}

export interface AddressErrors {
  address_line?: string;
  unit_number?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface AddressFieldsProps {
  prefix?: string; // for field names like "current_"
  values: AddressValues;
  onChange: (field: keyof AddressValues, value: string) => void;
  errors?: AddressErrors;
  required?: boolean;
}

export const AddressFields: React.FC<AddressFieldsProps> = ({
  prefix = "",
  values,
  onChange,
  errors = {},
  required = false,
}) => {
  const fieldName = (base: string) => `${prefix}${base}`;

  return (
    <div className="space-y-4">
      {/* Street Address — full width */}
      <Input
        label="Street Address"
        name={fieldName("address_line")}
        value={values.address_line}
        onChange={(e) => onChange("address_line", e.target.value)}
        error={errors.address_line}
        required={required}
        placeholder="e.g. 123 Main Street"
        maxLength={200}
      />

      {/* Unit Number — optional, full width */}
      <Input
        label="Unit / Apt / Suite (optional)"
        name={fieldName("unit_number")}
        value={values.unit_number ?? ""}
        onChange={(e) => onChange("unit_number", e.target.value)}
        error={errors.unit_number}
        required={false}
        placeholder="e.g. Apt 4B"
        maxLength={20}
      />

      {/* City / State / ZIP — compact row */}
      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-3">
          <Input
            label="City"
            name={fieldName("city")}
            value={values.city}
            onChange={(e) => onChange("city", e.target.value)}
            error={errors.city}
            required={required}
            placeholder="e.g. Columbus"
            maxLength={100}
          />
        </div>
        <div className="col-span-2">
          <Select
            label="State"
            name={fieldName("state")}
            value={values.state}
            onChange={(val) => onChange("state", val)}
            options={US_STATES}
            error={errors.state}
            required={required}
            placeholder="Select state"
          />
        </div>
        <div className="col-span-1">
          <Input
            label="ZIP"
            name={fieldName("zip")}
            value={values.zip}
            onChange={(e) => onChange("zip", e.target.value)}
            error={errors.zip}
            required={required}
            placeholder="43215"
            inputMode="numeric"
            maxLength={10}
          />
        </div>
      </div>
    </div>
  );
};

export { US_STATES };
export default AddressFields;

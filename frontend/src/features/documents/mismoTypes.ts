export interface MISMODocumentType {
  code: string;
  label: string;
}

export interface MISMOCategory {
  id: string;
  label: string;
  types: MISMODocumentType[];
}

export const MISMO_CATEGORIES: MISMOCategory[] = [
  {
    id: "income_employment",
    label: "Income & Employment",
    types: [
      { code: "W2", label: "W-2 (Wage & Tax Statement)" },
      { code: "PayStub", label: "Pay Stub" },
      { code: "TaxReturn1040", label: "Federal Tax Return (1040)" },
      { code: "ScheduleEK1", label: "Schedule E / K-1" },
      { code: "EmploymentVerificationLetter", label: "Employment Verification Letter (VOE)" },
      { code: "SelfEmploymentPL", label: "Profit & Loss Statement" },
      { code: "BusinessTaxReturn", label: "Business Tax Return (1120 / 1065)" },
      { code: "1099", label: "1099 Income Statement" },
      { code: "SocialSecurityAwardLetter", label: "Social Security Award Letter" },
      { code: "PensionAwardLetter", label: "Pension / Retirement Award Letter" },
    ],
  },
  {
    id: "assets",
    label: "Assets & Reserves",
    types: [
      { code: "BankStatement", label: "Bank Statement (VOD)" },
      { code: "InvestmentStatement", label: "Investment / Brokerage Statement" },
      { code: "RetirementStatement", label: "Retirement Account Statement (401k / IRA)" },
      { code: "GiftLetter", label: "Gift Letter" },
      { code: "AssetVerification", label: "Asset Verification Letter" },
      { code: "CryptoCurrencyStatement", label: "Cryptocurrency Holdings Statement" },
    ],
  },
  {
    id: "credit",
    label: "Credit & Liabilities",
    types: [
      { code: "CreditReport", label: "Credit Report (Tri-Merge)" },
      { code: "CreditSupplement", label: "Credit Supplement / Rapid Rescore" },
      { code: "CreditExplanationLetter", label: "Letter of Explanation – Credit" },
      { code: "MortgageStatement", label: "Mortgage Statement" },
      { code: "DebtVerification", label: "Debt Payoff / Verification Letter" },
    ],
  },
  {
    id: "property",
    label: "Property",
    types: [
      { code: "AppraisalReport", label: "Appraisal Report (URAR 1004)" },
      { code: "TitleCommitment", label: "Title Commitment / Preliminary Report" },
      { code: "HazardInsurancePolicy", label: "Homeowner's Insurance Declaration Page" },
      { code: "FloodCertification", label: "Flood Zone Determination Certificate" },
      { code: "HOADocs", label: "HOA Documents / Budget" },
      { code: "PropertyTaxStatement", label: "Property Tax Statement" },
      { code: "PurchaseContract", label: "Purchase & Sale Agreement" },
      { code: "EscrowInstructions", label: "Escrow Instructions" },
    ],
  },
  {
    id: "loan_application",
    label: "Loan Application & Disclosures",
    types: [
      { code: "URLA1003", label: "Uniform Residential Loan Application (1003)" },
      { code: "LoanEstimate", label: "Loan Estimate (LE)" },
      { code: "ClosingDisclosure", label: "Closing Disclosure (CD)" },
      { code: "InitialDisclosures", label: "Initial Disclosures Package" },
      { code: "IntentToProceed", label: "Intent to Proceed" },
      { code: "LockConfirmation", label: "Rate Lock Confirmation" },
    ],
  },
  {
    id: "identity",
    label: "Identity & Legal",
    types: [
      { code: "DriversLicense", label: "Government-Issued Photo ID" },
      { code: "SocialSecurityCard", label: "Social Security Card" },
      { code: "VisaResidencyDoc", label: "Visa / Permanent Residency Document (Green Card)" },
      { code: "TrustDocument", label: "Trust Agreement" },
      { code: "DivorceDecree", label: "Divorce Decree / Separation Agreement" },
      { code: "PowerOfAttorney", label: "Power of Attorney (POA)" },
    ],
  },
  {
    id: "closing",
    label: "Closing",
    types: [
      { code: "NoteAndDeedOfTrust", label: "Promissory Note & Deed of Trust" },
      { code: "SettlementStatement", label: "Settlement Statement (HUD-1 / ALTA)" },
      { code: "WireInstructions", label: "Wire Transfer Instructions" },
      { code: "FinalAppraisalAcknowledgment", label: "Final Appraisal Acknowledgment" },
      { code: "FinalInspection", label: "Final Inspection Report" },
    ],
  },
  {
    id: "other",
    label: "Other",
    types: [
      { code: "LOELetter", label: "Letter of Explanation (LOE)" },
      { code: "Other", label: "Other / Miscellaneous" },
    ],
  },
];

/** All type codes flattened, for validation */
export const ALL_MISMO_CODES = new Set(
  MISMO_CATEGORIES.flatMap((c) => c.types.map((t) => t.code))
);

export function getCategoryForType(code: string): MISMOCategory {
  for (const cat of MISMO_CATEGORIES) {
    if (cat.types.some((t) => t.code === code)) return cat;
  }
  return MISMO_CATEGORIES[MISMO_CATEGORIES.length - 1];
}

export function getLabelForType(code: string): string {
  for (const cat of MISMO_CATEGORIES) {
    const t = cat.types.find((t) => t.code === code);
    if (t) return t.label;
  }
  return code;
}

export function getAllTypesFlat(): MISMODocumentType[] {
  return MISMO_CATEGORIES.flatMap((c) => c.types);
}

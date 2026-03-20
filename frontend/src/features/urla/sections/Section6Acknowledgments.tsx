import React, { useState } from "react";
import { Info } from "lucide-react";
import { Checkbox, FormSection } from "@/design-system/components";
import type { FullBorrower } from "@/types/urla";
import type { UseURLAFormReturn } from "../hooks/useURLAForm";

interface Section6Props {
  borrower: FullBorrower | undefined;
  formHook: UseURLAFormReturn;
}

const CERTIFICATION_TEXT = `
I/We certify that the information provided in this application is true and correct as of the date set forth opposite my/our signature(s) on this application and acknowledge my/our understanding of any notices regarding the application and the Equal Credit Opportunity Act.

I/We understand that if I/We falsely certify information on this application, I/We may be liable under Federal law for criminal penalties including, but not limited to, fine or imprisonment or both under 18 U.S.C. Section 1001, et seq., and liability for civil damages under 12 U.S.C. Section 1833a.

The undersigned specifically acknowledge(s) and agree(s) that: (1) The loan requested by this application will be secured by a lien on the property described in this application; (2) The property will not be used for any illegal or restricted purpose; (3) All statements made in this application are made for the purpose of obtaining the loan indicated; (4) Verification or reverification of any information contained in the application may be made at any time by the Lender, its agents, successors and assigns, whether before or after loan commitment.
`.trim();

export const Section6Acknowledgments: React.FC<Section6Props> = ({
  borrower,
}) => {
  const [agreedToApp, setAgreedToApp] = useState(false);
  const [agreedToCreditPull, setAgreedToCreditPull] = useState(false);
  const [agreedToECOA, setAgreedToECOA] = useState(false);
  const [agreedElectronic, setAgreedElectronic] = useState(false);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const borrowerName = borrower
    ? `${borrower.first_name} ${borrower.middle_name ? borrower.middle_name + " " : ""}${borrower.last_name}${borrower.suffix_name ? " " + borrower.suffix_name : ""}`
    : "Borrower";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-neutral-900">
          Section 6: Acknowledgments and Agreements
        </h2>
        <p className="text-sm text-neutral-600 mt-1">
          Please read and acknowledge the following statements.
        </p>
      </div>

      {/* Important notice */}
      <div
        className="flex items-start gap-3 p-4 bg-primary-50 border border-primary-200 rounded-lg"
        role="note"
        aria-label="Important information"
      >
        <Info className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-primary-800">
          Your signature does not lock your rate or commit you to this loan program. You may still request changes to loan terms prior to closing.
        </p>
      </div>

      {/* Certification text */}
      <FormSection title="Borrower Certification">
        <div
          className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg max-h-48 overflow-y-auto"
          aria-label="Certification text"
          tabIndex={0}
        >
          <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-line">
            {CERTIFICATION_TEXT}
          </p>
        </div>

        <div className="space-y-3">
          <Checkbox
            label='I/We certify that the information provided in this application is true and correct as of the date set forth, and acknowledge my/our understanding of the Notice to Applicants'
            name="agreed_to_app"
            checked={agreedToApp}
            onChange={setAgreedToApp}
            description="Required to proceed"
          />

          <Checkbox
            label="I authorize the Lender to obtain a tri-merge credit report"
            name="agreed_credit_pull"
            checked={agreedToCreditPull}
            onChange={setAgreedToCreditPull}
            description="Required to process your application"
          />

          <Checkbox
            label="I have read and understand the Equal Credit Opportunity Act disclosures"
            name="agreed_ecoa"
            checked={agreedToECOA}
            onChange={setAgreedToECOA}
          />

          <Checkbox
            label="By checking this box I am signing this application electronically"
            name="agreed_electronic"
            checked={agreedElectronic}
            onChange={setAgreedElectronic}
            description="Your electronic signature is legally equivalent to a handwritten signature"
          />
        </div>
      </FormSection>

      {/* Signature display */}
      <FormSection title="Signature">
        <div className="flex flex-col gap-3 p-4 border border-neutral-200 rounded-lg bg-white">
          <div className="flex justify-between items-start text-sm">
            <div>
              <p className="text-neutral-500 text-xs mb-1">Borrower Name</p>
              <p className="font-semibold text-neutral-900 text-base italic font-serif">
                {borrowerName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-neutral-500 text-xs mb-1">Date</p>
              <p className="font-medium text-neutral-900">{today}</p>
            </div>
          </div>

          {!agreedElectronic && (
            <p className="text-xs text-neutral-500">
              Check the electronic signature box above to sign this application.
            </p>
          )}

          {agreedElectronic && (
            <p className="text-xs text-success flex items-center gap-1">
              <span aria-hidden="true">✓</span>
              Application electronically signed on {today}
            </p>
          )}
        </div>

        {(!agreedToApp || !agreedToCreditPull || !agreedToECOA) && (
          <p className="text-xs text-warning" role="alert">
            Please check all required acknowledgment boxes to complete this section.
          </p>
        )}
      </FormSection>
    </div>
  );
};

export default Section6Acknowledgments;

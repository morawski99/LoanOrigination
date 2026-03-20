import React from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Building2, MapPin, Phone, Mail, Calendar, BadgeCheck } from "lucide-react";
import { FormSection } from "@/design-system/components";
import { getCurrentUser } from "@/services/api";

interface Section9Props {
  loanId: string;
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`text-sm text-neutral-900 ${
          mono ? "font-mono font-semibold" : "font-medium"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export const Section9LoanOriginator: React.FC<Section9Props> = ({ loanId }) => {
  const { data: user, isLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes — user profile rarely changes
  });

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-neutral-900">
          Section 9: Loan Originator Information
        </h2>
        <p className="text-sm text-neutral-600 mt-1">
          This information is populated from your loan originator profile and is
          read-only. To update your profile, contact your system administrator.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div
            className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"
            aria-label="Loading loan originator information"
            role="status"
          />
        </div>
      ) : (
        <>
          {/* Loan Originator */}
          <FormSection title="Loan Originator" isComplete={Boolean(user)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <div className="space-y-1">
                  <InfoRow
                    label="Loan Originator Name"
                    value={user?.full_name ?? "—"}
                  />
                </div>
              </div>

              <InfoRow
                label="Loan Originator NMLS ID"
                value={
                  /* NMLS ID would come from extended user profile;
                     current user schema exposes only basic fields */
                  "Not configured — contact administrator"
                }
                mono={false}
              />

              <InfoRow
                label="Loan Originator Email"
                value={user?.email ?? "—"}
              />

              <InfoRow
                label="Loan Originator Role"
                value={user?.role ?? "—"}
              />
            </div>
          </FormSection>

          {/* Organization */}
          <FormSection title="Organization Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  <Building2 className="w-5 h-5 text-primary-600" />
                </div>
                <InfoRow
                  label="Organization Name"
                  value="LoanOrigination Financial, LLC"
                />
              </div>

              <InfoRow
                label="Organization NMLS ID"
                value="Not configured — contact administrator"
              />
            </div>

            <div className="flex items-start gap-3 mt-2">
              <div
                className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <MapPin className="w-5 h-5 text-neutral-500" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Organization Address
                </p>
                <p className="text-sm text-neutral-900 font-medium">
                  123 Financial Way, Suite 400
                </p>
                <p className="text-sm text-neutral-700">
                  New York, NY 10001
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">
              <div className="flex items-center gap-3">
                <Phone
                  className="w-4 h-4 text-neutral-400 shrink-0"
                  aria-hidden="true"
                />
                <InfoRow
                  label="Organization Phone"
                  value="(800) 555-0100"
                />
              </div>
              <div className="flex items-center gap-3">
                <Mail
                  className="w-4 h-4 text-neutral-400 shrink-0"
                  aria-hidden="true"
                />
                <InfoRow
                  label="Organization Email"
                  value="lending@loanorigination.com"
                />
              </div>
            </div>
          </FormSection>

          {/* Application Date */}
          <FormSection title="Application Date" isComplete>
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <Calendar className="w-5 h-5 text-success" />
              </div>
              <div className="space-y-1">
                <InfoRow label="Date of Application" value={today} />
                <p className="text-xs text-neutral-500">
                  Auto-set to today's date when this section is viewed.
                </p>
              </div>
            </div>
          </FormSection>

          {/* Compliance notice */}
          <div
            className="flex items-start gap-3 p-4 bg-neutral-50 border border-neutral-200 rounded-lg"
            role="note"
            aria-label="Regulatory notice"
          >
            <BadgeCheck
              className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="text-sm text-neutral-700">
              <p className="font-semibold mb-1">Regulatory Notice</p>
              <p>
                The loan originator identified above is the individual who took
                this application. This information is required by the
                Secure and Fair Enforcement for Mortgage Licensing Act (SAFE
                Act) and will appear on the final Uniform Residential Loan
                Application submitted to the lender.
              </p>
            </div>
          </div>

          {/* Hidden anchor used by review page */}
          <span data-loan-id={loanId} className="sr-only" aria-hidden="true" />
        </>
      )}
    </div>
  );
};

export default Section9LoanOriginator;

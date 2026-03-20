import React, { useState } from "react";
import { clsx } from "clsx";
import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react";

export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  isComplete?: boolean;
  collapsible?: boolean;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  isComplete = false,
  collapsible = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sectionId = `section-${title.toLowerCase().replace(/\s+/g, "-")}`;
  const contentId = `${sectionId}-content`;

  return (
    <section
      className="w-full"
      aria-labelledby={sectionId}
    >
      {/* Header */}
      <div
        className={clsx(
          "flex items-center justify-between py-4",
          collapsible && "cursor-pointer select-none"
        )}
        onClick={collapsible ? () => setIsCollapsed((prev) => !prev) : undefined}
        role={collapsible ? "button" : undefined}
        aria-expanded={collapsible ? !isCollapsed : undefined}
        aria-controls={collapsible ? contentId : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={
          collapsible
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsCollapsed((prev) => !prev);
                }
              }
            : undefined
        }
      >
        <div className="flex items-center gap-3">
          <h3
            id={sectionId}
            className="text-base font-semibold text-neutral-900"
          >
            {title}
          </h3>
          {isComplete && (
            <CheckCircle
              className="w-5 h-5 text-success shrink-0"
              aria-label="Section complete"
            />
          )}
        </div>

        {collapsible && (
          <span
            className="text-neutral-500"
            aria-hidden="true"
          >
            {isCollapsed ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
          </span>
        )}
      </div>

      {description && !isCollapsed && (
        <p className="text-sm text-neutral-600 -mt-2 mb-4">{description}</p>
      )}

      {/* Horizontal rule */}
      <hr className="border-neutral-200 mb-6" aria-hidden="true" />

      {/* Content */}
      {!isCollapsed && (
        <div
          id={collapsible ? contentId : undefined}
          className="space-y-5"
        >
          {children}
        </div>
      )}
    </section>
  );
};

export default FormSection;

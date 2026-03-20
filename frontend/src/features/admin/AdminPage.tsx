import React from "react";
import { Settings } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="bg-primary-800 text-white px-6 py-3 flex items-center gap-2 shadow-md">
        <Settings className="w-5 h-5" aria-hidden="true" />
        <span className="font-bold">LoanOrigination</span>
      </header>
      <main className="page-container py-8" id="main-content">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          Administration
        </h1>
        <p className="text-neutral-600">
          Manage users, roles, system configuration, and audit logs for the
          LoanOrigination platform.
        </p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: "User Management",
              description:
                "Create and manage user accounts, assign roles, and control access permissions.",
              icon: "👤",
            },
            {
              title: "Role Configuration",
              description:
                "Configure permissions for Loan Officers, Processors, Underwriters, and other roles.",
              icon: "🔐",
            },
            {
              title: "Audit Log",
              description:
                "View a complete immutable audit trail of all system actions and data changes.",
              icon: "📋",
            },
            {
              title: "System Settings",
              description:
                "Configure loan limits, rate sheets, investor guidelines, and system parameters.",
              icon: "⚙️",
            },
            {
              title: "Integration Settings",
              description:
                "Manage API connections to Fannie Mae, Freddie Mac, credit bureaus, and title companies.",
              icon: "🔗",
            },
            {
              title: "Compliance",
              description:
                "Configure HMDA reporting, fair lending monitoring, and regulatory compliance settings.",
              icon: "⚖️",
            },
          ].map(({ title, description, icon }) => (
            <div
              key={title}
              className="card p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="text-2xl mb-3" aria-hidden="true">
                {icon}
              </div>
              <h2 className="text-sm font-semibold text-neutral-900 mb-1">
                {title}
              </h2>
              <p className="text-xs text-neutral-600">{description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

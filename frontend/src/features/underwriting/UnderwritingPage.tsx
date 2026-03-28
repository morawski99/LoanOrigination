import { BarChart2 } from "lucide-react";

export default function UnderwritingPage() {
  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="bg-primary-800 text-white px-6 py-3 flex items-center gap-2 shadow-md">
        <BarChart2 className="w-5 h-5" aria-hidden="true" />
        <span className="font-bold">LoanOrigination</span>
      </header>
      <main className="page-container py-8" id="main-content">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          Underwriting Queue
        </h1>
        <p className="text-neutral-600">
          Review and process loan applications assigned to the underwriting
          team. This module will display AUS findings, condition tracking,
          and underwriting decision workflows.
        </p>
        <div className="mt-8 card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-4">
            <BarChart2 className="w-7 h-7 text-primary-600" aria-hidden="true" />
          </div>
          <p className="text-lg font-semibold text-neutral-700">
            Underwriting Module
          </p>
          <p className="text-sm text-neutral-500 mt-1 max-w-md">
            Desktop Underwriter (DU) and Loan Product Advisor (LPA) integration,
            condition management, and underwriter decision tools will be
            available here.
          </p>
        </div>
      </main>
    </div>
  );
}

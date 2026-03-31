import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import LoginPage from "@/features/auth/LoginPage";

// Lazy-loaded pages
const PipelinePage = lazy(() => import("@/features/pipeline/PipelinePage"));
const NewLoanPage = lazy(() => import("@/features/loan/NewLoanPage"));
const LoanFilePage = lazy(() => import("@/features/loan/LoanFilePage"));
const URLAPage = lazy(() => import("@/features/urla/URLAPage"));
const URLAReviewPage = lazy(() => import("@/features/urla/URLAReviewPage"));
const UnderwritingPage = lazy(
  () => import("@/features/underwriting/UnderwritingPage")
);
const ClosingPage = lazy(() => import("@/features/closing/ClosingPage"));
const ReportsPage = lazy(() => import("@/features/reports/ReportsPage"));
const AdminPage = lazy(() => import("@/features/admin/AdminPage"));
const CompliancePage = lazy(
  () => import("@/features/compliance/CompliancePage")
);

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-neutral-600">Loading...</p>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/pipeline" replace />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/pipeline",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <PipelinePage />
      </Suspense>
    ),
  },
  {
    path: "/loans/new",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <NewLoanPage />
      </Suspense>
    ),
  },
  {
    path: "/loans/:loanId",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <LoanFilePage />
      </Suspense>
    ),
  },
  {
    path: "/loans/:loanId/urla",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <URLAPage />
      </Suspense>
    ),
  },
  {
    path: "/loans/:loanId/urla/review",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <URLAReviewPage />
      </Suspense>
    ),
  },
  {
    path: "/underwriting",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <UnderwritingPage />
      </Suspense>
    ),
  },
  {
    path: "/closing",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <ClosingPage />
      </Suspense>
    ),
  },
  {
    path: "/compliance",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <CompliancePage />
      </Suspense>
    ),
  },
  {
    path: "/reports",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <ReportsPage />
      </Suspense>
    ),
  },
  {
    path: "/admin",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <AdminPage />
      </Suspense>
    ),
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

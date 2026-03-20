import React, { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (
          error instanceof Error &&
          "status" in error &&
          typeof (error as { status?: number }).status === "number"
        ) {
          const status = (error as { status?: number }).status ?? 0;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 2;
      },
    },
  },
});

function LoadingSpinner() {
  return (
    <div
      className="flex items-center justify-center min-h-screen bg-neutral-100"
      role="status"
      aria-label="Loading application"
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2
          className="w-8 h-8 text-primary-600 animate-spin"
          aria-hidden="true"
        />
        <p className="text-sm text-neutral-600 font-medium">Loading...</p>
      </div>
    </div>
  );
}

export interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
    </QueryClientProvider>
  );
}

export default Providers;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input } from "@/design-system/components";
import { useAuth } from "@/hooks/useAuth";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      await login(data.email, data.password);
      navigate("/pipeline", { replace: true });
    } catch (error: unknown) {
      let message = "Invalid email or password. Please try again.";
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response
      ) {
        const responseData = error.response.data;
        if (
          responseData &&
          typeof responseData === "object" &&
          "detail" in responseData
        ) {
          message = String(responseData.detail);
        }
      }
      setServerError(message);
      // Return focus to email field on error
      setFocus("email");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center px-4">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <main
        id="main-content"
        className="w-full max-w-md"
        aria-labelledby="login-heading"
      >
        {/* Logo / Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-800 mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <h1
            id="login-heading"
            className="text-2xl font-bold text-primary-800"
          >
            LoanOrigination
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Enterprise Home Loan Origination System
          </p>
        </div>

        {/* Login Card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-neutral-900 mb-6">
            Sign in to your account
          </h2>

          {/* Server Error */}
          {serverError && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-6 px-4 py-3 rounded bg-red-50 border border-red-200 text-error text-sm flex items-start gap-2"
            >
              <span aria-hidden="true" className="shrink-0 mt-0.5">
                ⚠
              </span>
              {serverError}
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            aria-label="Login form"
          >
            <div className="flex flex-col gap-5">
              <Input
                label="Email address"
                type="email"
                required
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register("email")}
              />

              <Input
                label="Password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                error={errors.password?.message}
                {...register("password")}
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  className="w-full"
                >
                  Sign in
                </Button>
              </div>
            </div>
          </form>

          <p className="text-xs text-neutral-500 text-center mt-6">
            Having trouble signing in? Contact your system administrator.
          </p>
        </div>

        <p className="text-xs text-neutral-500 text-center mt-4">
          &copy; {new Date().getFullYear()} LoanOrigination. All rights
          reserved.
        </p>
      </main>
    </div>
  );
}

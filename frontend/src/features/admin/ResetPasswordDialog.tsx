import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/design-system/components";
import { resetUserPassword } from "@/services/api";
import type { UserResponse } from "@/types/user";

interface ResetPasswordDialogProps {
  user: UserResponse;
  onClose: () => void;
}

export default function ResetPasswordDialog({
  user,
  onClose,
}: ResetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () => resetUserPassword(user.id, password),
    onSuccess: () => setSuccess(true),
  });

  const passwordsMatch = password === confirm;
  const canSubmit =
    password.length >= 8 && passwordsMatch && !mutation.isPending && !success;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Reset Password
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {user.full_name} ({user.email})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {success ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              Password has been reset successfully.
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {password.length > 0 && password.length < 8 && (
                  <p className="text-xs text-red-500 mt-1">
                    Password must be at least 8 characters
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {confirm.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-red-500 mt-1">
                    Passwords do not match
                  </p>
                )}
              </div>

              {mutation.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {mutation.error instanceof Error
                    ? mutation.error.message
                    : "Failed to reset password. Please try again."}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200">
          <Button variant="ghost" onClick={onClose}>
            {success ? "Close" : "Cancel"}
          </Button>
          {!success && (
            <Button
              variant="primary"
              disabled={!canSubmit}
              isLoading={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              Reset Password
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

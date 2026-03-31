import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/design-system/components";
import { updateUser } from "@/services/api";
import type { UserResponse } from "@/types/user";

const ROLES = [
  { value: "LoanOfficer", label: "Loan Officer" },
  { value: "Processor", label: "Processor" },
  { value: "Underwriter", label: "Underwriter" },
  { value: "Closer", label: "Closer" },
  { value: "SecondaryMarketing", label: "Secondary Marketing" },
  { value: "BranchManager", label: "Branch Manager" },
  { value: "ComplianceOfficer", label: "Compliance Officer" },
  { value: "Admin", label: "Admin" },
];

interface EditUserDialogProps {
  user: UserResponse;
  onClose: () => void;
}

export default function EditUserDialog({ user, onClose }: EditUserDialogProps) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(user.full_name);
  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.is_active);

  const mutation = useMutation({
    mutationFn: () =>
      updateUser(user.id, {
        full_name: fullName,
        role,
        is_active: isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
  });

  const canSubmit = fullName.trim() && !mutation.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Edit User
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">{user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="is-active" className="text-sm text-neutral-700">
              Active account
            </label>
          </div>

          {mutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Failed to update user. Please try again."}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200">
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!canSubmit}
            isLoading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

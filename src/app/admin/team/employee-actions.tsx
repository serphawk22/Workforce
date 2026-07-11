"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { disableEmployee, enableEmployee, resetEmployeePassword } from "@/actions/admin-employees";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export function ResetPasswordButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function handleReset() {
    setLoading(true);
    const result = await resetEmployeePassword(userId);
    if (result?.success && result.tempPassword) {
      setTempPassword(result.tempPassword);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <>
      <button
        onClick={handleReset}
        disabled={loading}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? "Resetting..." : "Reset Password"}
      </button>

      <Modal open={!!tempPassword} onClose={() => setTempPassword(null)}>
        <div className="p-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800 mb-2">
              Password Reset Successfully
            </p>
            <p className="text-sm text-amber-700 mb-2">
              New temporary password:
            </p>
            <div className="relative">
              <input
                readOnly
                value={tempPassword ?? ""}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full rounded-md border border-amber-200 bg-white px-4 py-3 pr-16 font-mono text-sm text-gray-900 text-center"
              />
              <CopyButton text={tempPassword ?? ""} />
            </div>
            <p className="text-xs text-amber-600 mt-2">
              The employee will be required to change their password on next login.
            </p>
          </div>
          <Button onClick={() => setTempPassword(null)} className="w-full mt-4">
            Done
          </Button>
        </div>
      </Modal>
    </>
  );
}

export function DisableEmployeeButton({ userId, isActive }: { userId: string; isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleToggle() {
    setLoading(true);
    if (isActive) {
      await disableEmployee(userId);
    } else {
      await enableEmployee(userId);
    }
    router.refresh();
    setLoading(false);
    setShowConfirm(false);
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
          isActive
            ? "border-red-300 text-red-700 hover:bg-red-50"
            : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        }`}
      >
        {loading ? "..." : isActive ? "Disable" : "Enable"}
      </button>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={isActive ? "Disable Employee" : "Enable Employee"}
        message={
          isActive
            ? "This employee will not be able to log in until re-enabled. Their tasks and data will be preserved."
            : "This employee will regain access to their account."
        }
        confirmLabel={isActive ? "Disable" : "Enable"}
        onConfirm={handleToggle}
      />
    </>
  );
}

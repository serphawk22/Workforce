"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEmployee } from "@/actions/admin-employees";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

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

export function CreateEmployeeModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setTempPassword(null);

    const formData = new FormData(e.currentTarget);
    const result = await createEmployee(null, formData);

    if (result?.success && result.tempPassword) {
      setTempPassword(result.tempPassword);
    } else if (result?.error) {
      setErrors(result.error as Record<string, string[]>);
    }
    setLoading(false);
  }

  function handleClose() {
    setOpen(false);
    setTempPassword(null);
    setErrors({});
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
      >
        Create Employee
      </button>

      <Modal open={open} onClose={handleClose}>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Create Employee Account
          </h2>

          {tempPassword ? (
            <div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 mb-4">
                <p className="text-sm font-medium text-emerald-800 mb-2">
                  Account created successfully!
                </p>
                <p className="text-sm text-emerald-700 mb-2">
                  Share this temporary password with the employee:
                </p>
                <div className="relative">
                  <input
                    readOnly
                    value={tempPassword}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="w-full rounded-md border border-emerald-200 bg-white px-4 py-3 pr-16 font-mono text-sm text-gray-900 text-center"
                  />
                  <CopyButton text={tempPassword} />
                </div>
                <p className="text-xs text-emerald-600 mt-2">
                  The employee will be required to change their password on first login.
                </p>
              </div>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="John Doe"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
                />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name[0]}</p>}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="john@company.com"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
                />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email[0]}</p>}
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" loading={loading} className="flex-1">
                  Create Account
                </Button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}

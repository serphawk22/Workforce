"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setupAccount } from "@/actions/setup";
import { Button } from "@/components/ui/button";

export function SetupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: ["Passwords do not match"] });
      setLoading(false);
      return;
    }

    const result = await setupAccount(null, formData);

    if (result?.success) {
      router.push("/dashboard");
      router.refresh();
    } else if (result?.error) {
      setErrors(result.error as Record<string, string[]>);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1.5">
          Display Name <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          placeholder="How others see you"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
        />
      </div>

      <div>
        <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-700 mb-1.5">
          Profile Picture URL <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="avatarUrl"
          name="avatarUrl"
          type="url"
          placeholder="https://example.com/avatar.jpg"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
        />
        <p className="text-xs text-gray-400 mt-1">Leave empty to use initials.</p>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
          New Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="At least 6 characters"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
        />
        {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password[0]}</p>}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={6}
          placeholder="Repeat your password"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
        />
        {errors.confirmPassword && <p className="text-sm text-red-500 mt-1">{errors.confirmPassword[0]}</p>}
      </div>

      <Button type="submit" loading={loading} className="w-full">
        Complete Setup
      </Button>
    </form>
  );
}

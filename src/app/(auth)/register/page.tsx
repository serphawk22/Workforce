"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { register } from "@/actions/register";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  function getFieldError(field: string): string | undefined {
    return errors[field]?.[0];
  }

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

    const result = await register(null, formData);

    if (result?.success) {
      router.push("/login");
    } else if (result?.error) {
      setErrors(result.error as Record<string, string[]>);
    }
    setLoading(false);
  }

  const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900";
  const errorInputClass = "w-full rounded-lg border border-red-500 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:ring-2 focus:ring-red-500/10 focus:border-red-500";

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2.5 text-xl font-bold text-gray-900">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="28" height="28" rx="6" fill="#111827" />
            <path d="M8 14L12 18L20 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          TaskFlow
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Create an account</h1>
          <p className="mt-1.5 text-sm text-gray-500">Get started with TaskFlow today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input id="name" name="name" type="text" autoComplete="name" required placeholder="Your name" className={getFieldError("name") ? errorInputClass : inputClass} />
            {getFieldError("name") && <p className="text-sm text-red-500 mt-1">{getFieldError("name")}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required placeholder="name@example.com" className={getFieldError("email") ? errorInputClass : inputClass} />
            {getFieldError("email") && <p className="text-sm text-red-500 mt-1">{getFieldError("email")}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required placeholder="Create a password" className={getFieldError("password") ? errorInputClass : inputClass} />
            {getFieldError("password") && <p className="text-sm text-red-500 mt-1">{getFieldError("password")}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required placeholder="Confirm your password" className={getFieldError("confirmPassword") ? errorInputClass : inputClass} />
            {getFieldError("confirmPassword") && <p className="text-sm text-red-500 mt-1">{getFieldError("confirmPassword")}</p>}
          </div>

          {errors._form && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5" role="alert">
              <p className="text-sm font-medium text-red-700">{errors._form[0]}</p>
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Create account
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-gray-900 transition-colors hover:text-gray-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}

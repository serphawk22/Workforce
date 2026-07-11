import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { SetupForm } from "./setup-form";

export default async function SetupPage() {
  const session = await requireAuth();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { firstLoginRequired: true },
  });

  if (!user?.firstLoginRequired) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2.5 text-xl font-bold text-gray-900">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="28" height="28" rx="6" fill="#111827" />
              <path d="M8 14L12 18L20 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            TaskFlow
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-gray-900">Set Up Your Account</h1>
            <p className="mt-1.5 text-sm text-gray-500">
              This is your first login. Please set a new password.
            </p>
          </div>
          <SetupForm />
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu } from "@/components/ui/dropdown-menu";

type Workspace = { id: string; name: string };

export function AdminNav({
  workspaces,
}: {
  workspaces: Workspace[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const navLinks = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/team", label: "Team" },
    { href: "/admin/google-sync", label: "Sync" },
  ];

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-lg font-bold text-gray-900"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 28 28"
              fill="none"
            >
              <rect width="28" height="28" rx="6" fill="#2563EB" />
              <path
                d="M8 14L12 18L20 10"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            TaskFlow
            <span className="ml-1 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Admin
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <select
            onChange={(e) => {
              if (e.target.value) router.push(`/workspace/${e.target.value}`);
            }}
            className="max-w-[180px] truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-gray-300 focus:outline-none"
          >
            <option value="">All workspaces</option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/team"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            Team
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            Main App
          </Link>

          <DropdownMenu
            trigger={
              <button className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-gray-100">
                <Avatar
                  name={session?.user?.name || "Admin"}
                  url={session?.user?.image}
                  size="sm"
                />
              </button>
            }
            items={[
              {
                label: "Profile Settings",
                onClick: () => router.push("/profile"),
              },
              {
                label: "Sign out",
                onClick: () => signOut({ callbackUrl: "/login" }),
                danger: true,
              },
            ]}
          />
        </div>
      </div>
    </nav>
  );
}
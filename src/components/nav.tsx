"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu } from "@/components/ui/dropdown-menu";

type Workspace = { id: string; name: string };

export function Nav({
  workspaces,
  currentWorkspaceId,
}: {
  workspaces: Workspace[];
  currentWorkspaceId?: string;
}) {
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                width="28"
                height="28"
                rx="6"
                fill="currentColor"
                className="text-blue-600"
              />
              <path
                d="M8 14L12 18L20 10"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            TaskFlow
          </Link>

          <select
            value={currentWorkspaceId || ""}
            onChange={(e) => {
              if (e.target.value) router.push(`/workspace/${e.target.value}`);
            }}
            className="max-w-[180px] truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-gray-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            {!currentWorkspaceId && (
              <option value="">All workspaces</option>
            )}
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/my-tasks"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            My Tasks
          </Link>
          <Link
            href="/team"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            Team
          </Link>
          {session?.user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              Admin
            </Link>
          )}

          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            aria-label="Notifications"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>

          <DropdownMenu
            trigger={
              <button className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                <Avatar
                  name={session?.user?.name || "User"}
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

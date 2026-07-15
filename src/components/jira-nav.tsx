"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { CreateTaskModal } from "@/components/task/create-task-modal";

type Member = { id: string; name: string; email: string };
type ProjectItem = { id: string; name: string; key: string };

export function JiraNav({
  members,
  projects,
  workspaces,
}: {
  members?: Member[];
  projects?: ProjectItem[];
  workspaces?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [showCreate, setShowCreate] = useState(false);
  const isAdmin = session?.user?.role === "ADMIN";

  const mainLinks = [
    { href: "/dashboard", label: "Home" },
    { href: "/my-tasks", label: "Your Work" },
    { href: "/my-projects", label: "Projects" },
    { href: "/team", label: "Teams" },
  ];

  const secondaryLinks = [
    { href: "/calendar", label: "Calendar" },
    { href: "/reports", label: "Reports" },
    { href: "/admin/analytics", label: "Analytics" },
  ];

  const adminLinks = [
    { href: "/admin", label: "Administration" },
    { href: "/admin/work-updates", label: "Work Updates" },
    { href: "/reports", label: "Reports" },
  ];

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  function NavLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
    const isActiveLink = active !== undefined ? active : isActive(href);
    return (
      <Link
        href={href}
        className={`rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
          isActiveLink
            ? "bg-gray-100 text-gray-900"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <>
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-40 shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-1 overflow-x-auto">
            <Link
              href="/dashboard"
              className="mr-3 flex shrink-0 items-center gap-2 text-lg font-bold text-gray-900"
            >
              <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="6" fill="#2563EB" />
                <path d="M8 14L12 18L20 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="hidden sm:inline">TaskFlow</span>
            </Link>

            {mainLinks.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} />
            ))}

            <span className="mx-1.5 h-4 w-px bg-gray-200" />

            {secondaryLinks.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} />
            ))}

            {isAdmin && (
              <>
                <span className="mx-1.5 h-4 w-px bg-gray-200" />
                {adminLinks.map((link) => (
                  <NavLink key={link.href} href={link.href} label={link.label} />
                ))}
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push("/search")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>

            <button
              onClick={() => router.push("/notifications")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Notifications"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>

            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create
            </button>

            <DropdownMenu
              trigger={
                <button className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-gray-100">
                  <Avatar
                    name={session?.user?.name || "User"}
                    url={session?.user?.image}
                    size="sm"
                  />
                </button>
              }
              items={[
                { label: "Profile", onClick: () => router.push("/profile") },
                ...(isAdmin ? [{ label: "Admin Settings", onClick: () => router.push("/admin") }] : []),
                { label: "Sign out", onClick: () => signOut({ callbackUrl: "/login" }), danger: true },
              ]}
            />
          </div>
        </div>
      </nav>

      {showCreate && (
        <CreateTaskModal
          columnId=""
          projectId=""
          members={members || []}
          labels={[]}
          projects={projects || []}
          onClose={() => setShowCreate(false)}
        />
      )}
    </>
  );
}

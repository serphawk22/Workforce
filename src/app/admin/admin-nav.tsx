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

  const myWorkLinks = [
    { href: "/admin", label: "Dashboard" },
    { href: "/my-tasks", label: "My Tasks" },
    { href: "/my-projects", label: "My Projects" },
  ];

  const orgLinks = [
    { href: "/admin/team", label: "Team" },
    { href: "/admin/all-tasks", label: "All Tasks" },
    { href: "/admin/all-projects", label: "All Projects" },
    { href: "/admin/google-sync", label: "Google Sync" },
    { href: "/admin/analytics", label: "Analytics" },
  ];

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  function NavLinks({ links }: { links: typeof myWorkLinks }) {
    return links.map((link) => {
      const active = isActive(link.href);
      return (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
            active
              ? "bg-gray-100 text-gray-900"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          {link.label}
        </Link>
      );
    });
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Link
            href="/admin"
            className="flex shrink-0 items-center gap-2 text-lg font-bold text-gray-900"
          >
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="#2563EB" />
              <path d="M8 14L12 18L20 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            TaskFlow
            <span className="ml-0.5 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Admin
            </span>
          </Link>

          <span className="mx-2 h-5 w-px bg-gray-200 shrink-0" />

          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider shrink-0">My Work</span>
          <NavLinks links={myWorkLinks} />

          <span className="mx-2 h-5 w-px bg-gray-200 shrink-0" />

          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider shrink-0">Org</span>
          <NavLinks links={orgLinks} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
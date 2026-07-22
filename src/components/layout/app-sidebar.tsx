"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Columns3,
  CheckSquare,
  FolderKanban,
  Calendar,
  BarChart3,
  TrendingUp,
  Users,
  Shield,
  MessageSquare,
  Activity,
  ClipboardList,
  PenSquare,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";

const employeeLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/daily-work", label: "Daily Work", icon: PenSquare },
  { href: "/my-tasks", label: "My Tasks", icon: CheckSquare },
  { href: "/my-projects", label: "Projects", icon: FolderKanban },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/chat", label: "Chat", icon: MessageSquare },
];

const adminLinks = [
  { href: "/admin", label: "Administration", icon: Shield },
  { href: "/admin/all-tasks", label: "All Tasks", icon: CheckSquare },
  { href: "/admin/all-projects", label: "All Projects", icon: FolderKanban },
  { href: "/admin/team", label: "Teams", icon: Users },
  { href: "/admin/employee-tracking", label: "Work Updates", icon: Activity },
  { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
];

export function AppSidebar({ isAdmin, userName, userImage }: { isAdmin?: boolean; userName?: string | null; userImage?: string | null }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 260 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="sticky top-0 left-0 z-50 flex h-screen shrink-0 flex-col bg-card border-r border-border overflow-hidden"
    >
      <div className="flex h-14 items-center gap-3 px-4 border-b border-border">
        <motion.div
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
            <path d="M8 14L12 18L20 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm font-semibold text-foreground truncate"
            >
              TaskFlow
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {(!collapsed && (
          <div className="px-3 py-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Main Menu</p>
          </div>
        )) || <div className="h-6" />}

        {employeeLinks.map((link) => {
          const active = isActive(link.href);
          return (
            <Link key={link.href} href={link.href}>
              <div
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <link.icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
                {!collapsed && (
                  <span className="truncate">{link.label}</span>
                )}
              </div>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-3">
              {!collapsed && (
                <div className="px-3 py-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Administration</p>
                </div>
              )}
            </div>
            {adminLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link key={link.href} href={link.href}>
                  <div
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-accent text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <link.icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
                    {!collapsed && (
                      <span className="truncate">{link.label}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                name={userName || "User"}
                url={userImage}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {userName}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {isAdmin ? "Administrator" : "Employee"}
                </p>
              </div>
            </div>
          )}
          <div className="flex gap-1">
            {collapsed && (
              <button
                onClick={() => setCollapsed(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            {!collapsed && (
              <>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCollapsed(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

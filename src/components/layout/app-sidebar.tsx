"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Calendar,
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Shield,
  MessageSquare,
  Activity,
  ClipboardList,
} from "lucide-react";

const employeeLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/my-tasks", label: "My Tasks", icon: CheckSquare },
  { href: "/my-projects", label: "Projects", icon: FolderKanban },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
];

const adminLinks = [
  { href: "/admin", label: "Administration", icon: Shield },
  { href: "/admin/employee-tracking", label: "Employee Work Tracking", icon: Activity },
  { href: "/admin/daily-work", label: "Daily Work Tracker", icon: ClipboardList },
  { href: "/admin/team", label: "Teams", icon: Users },
  { href: "/admin/work-updates", label: "Work Updates", icon: Clock },
  { href: "/admin/all-tasks", label: "All Tasks", icon: CheckSquare },
  { href: "/admin/all-projects", label: "All Projects", icon: FolderKanban },
  { href: "/admin/workload", label: "Time Tracking", icon: Clock },
  { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = session?.user?.role === "ADMIN";

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 280 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="fixed left-0 top-0 z-50 flex h-screen flex-col bg-white border-r border-gray-200 overflow-hidden"
    >
      <div className="flex h-[72px] items-center gap-3 px-5 border-b border-gray-100">
        <motion.div
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
            <path d="M8 14L12 18L20 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-lg font-bold text-gray-900 truncate"
            >
              TaskFlow
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {(!collapsed && (
          <div className="px-3 py-1.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Main Menu</p>
          </div>
        )) || <div className="h-6" />}

        {employeeLinks.map((link) => {
          const active = isActive(link.href);
          return (
            <Link key={link.href} href={link.href}>
              <motion.div
                whileHover={{ x: 2 }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-primary"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                }`}
              >
                <link.icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.5 : 2} />
                {!collapsed && (
                  <span className="truncate">{link.label}</span>
                )}
              </motion.div>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-3">
              {!collapsed && (
                <div className="px-3 py-1.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Administration</p>
                </div>
              )}
            </div>
            {adminLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link key={link.href} href={link.href}>
                  <motion.div
                    whileHover={{ x: 2 }}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-blue-50 text-primary"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    }`}
                  >
                    <link.icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.5 : 2} />
                    {!collapsed && (
                      <span className="truncate">{link.label}</span>
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                name={session?.user?.name || "User"}
                url={session?.user?.image}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {isAdmin ? "Administrator" : "Employee"}
                </p>
              </div>
            </div>
          )}
          <div className="flex gap-1">
            {collapsed && (
              <button
                onClick={() => setCollapsed(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            {!collapsed && (
              <>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCollapsed(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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

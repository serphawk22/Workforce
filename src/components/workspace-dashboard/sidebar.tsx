"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  GitBranch,
  Calendar,
  BarChart3,
  Activity,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Kanban,
} from "lucide-react";

const sidebarLinks = [
  { href: "/workspace-dashboard", label: "Dashboard", icon: LayoutDashboard, matchExact: true },
  { href: "/my-projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/all-tasks", label: "All Tasks", icon: CheckSquare },
  { href: "/workspace-dashboard?view=sprints", label: "Sprints", icon: GitBranch },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/employee-tracking", label: "Activity", icon: Activity },
  { href: "/team", label: "Employees", icon: Users },
  { href: "/profile", label: "Settings", icon: Settings },
];

export function WorkspaceDashboardSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (link: typeof sidebarLinks[0]) => {
    if (link.matchExact) {
      if (link.href === "/workspace-dashboard") {
        return pathname === "/workspace-dashboard" && !searchParams.get("view");
      }
      return pathname === link.href;
    }
    return pathname.startsWith(link.href);
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 220 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="sticky top-0 left-0 z-40 flex h-screen shrink-0 flex-col bg-card border-r border-border overflow-hidden"
    >
      <div className="flex h-14 items-center gap-3 px-4 border-b border-border">
        <motion.div
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0"
        >
          <Kanban className="h-4 w-4" />
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm font-semibold text-foreground truncate"
            >
              Workspace
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {sidebarLinks.map((link) => {
          const active = isActive(link);
          return (
            <Link key={link.href + link.label} href={link.href}>
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
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground mx-auto"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </motion.aside>
  );
}

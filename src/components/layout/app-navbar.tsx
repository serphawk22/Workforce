"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { Avatar } from "@/components/ui/avatar";
import { CreateTaskModal } from "@/components/task/create-task-modal";
import {
  Search,
  Bell,
  Plus,
  ChevronDown,
  Settings,
  LogOut,
  User,
  LayoutDashboard,
} from "lucide-react";

type Member = { id: string; name: string; email: string };
type ProjectItem = { id: string; name: string; key: string };

export function AppNavbar({
  members,
  projects,
}: {
  members?: Member[];
  projects?: ProjectItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [showCreate, setShowCreate] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const isAdmin = session?.user?.role === "ADMIN";

  const breadcrumbs = pathname
    .split("/")
    .filter(Boolean)
    .map((segment, i, arr) => ({
      label: segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      href: "/" + arr.slice(0, i + 1).join("/"),
      isLast: i === arr.length - 1,
    }));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex h-full items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-1.5 text-sm">
                <Link
                  href="/dashboard"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                </Link>
                {breadcrumbs.map((crumb) => (
                  <span key={crumb.href} className="flex items-center gap-1.5">
                    <span className="text-muted-foreground/50">/</span>
                    {crumb.isLast ? (
                      <span className="font-medium text-foreground truncate max-w-[200px]">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[150px]"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>

            <button
              onClick={() => router.push("/notifications")}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Bell className="h-4 w-4" />
            </button>

            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create</span>
            </button>

            <div ref={profileRef} className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 rounded-lg p-1 hover:bg-muted transition-colors"
              >
                <Avatar
                  name={session?.user?.name || "User"}
                  url={session?.user?.image}
                  size="sm"
                />
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              </button>

              {showProfile && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-lg p-1.5 animate-fade-in">
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {session?.user?.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {session?.user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowProfile(false); router.push("/profile"); }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => { setShowProfile(false); router.push("/admin"); }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Admin Settings
                    </button>
                  )}
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={() => { setShowProfile(false); router.push("/login"); }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

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

      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div
            className="fixed inset-0 bg-background/50 backdrop-blur-sm"
            onClick={() => setShowSearch(false)}
          />
          <div className="relative w-full max-w-lg">
            <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-slide-in-up">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks, projects, people..."
                  className="flex-1 text-sm text-foreground placeholder:text-muted-foreground bg-transparent border-0 outline-none"
                />
              </div>
              {searchQuery && (
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowSearch(false);
                      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Search className="h-4 w-4" />
                    Search for &quot;{searchQuery}&quot;
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

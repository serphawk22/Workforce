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
      <header className="sticky top-0 z-40 h-[72px] border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="flex h-full items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-1.5 text-sm">
                <Link
                  href="/dashboard"
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                </Link>
                {breadcrumbs.map((crumb) => (
                  <span key={crumb.href} className="flex items-center gap-1.5">
                    <span className="text-gray-300">/</span>
                    {crumb.isLast ? (
                      <span className="font-medium text-gray-900 truncate max-w-[200px]">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="text-gray-500 hover:text-gray-700 transition-colors truncate max-w-[150px]"
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
              className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>

            <button
              onClick={() => router.push("/notifications")}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <Bell className="h-4 w-4" />
            </button>

            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create</span>
            </button>

            <div ref={profileRef} className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-gray-100 transition-colors"
              >
                <Avatar
                  name={session?.user?.name || "User"}
                  url={session?.user?.image}
                  size="sm"
                />
                <ChevronDown className="h-3.5 w-3.5 text-gray-400 hidden sm:block" />
              </button>

              {showProfile && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5 p-1.5 animate-fade-in">
                  <div className="px-3 py-2 border-b border-gray-100 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session?.user?.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {session?.user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowProfile(false); router.push("/profile"); }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => { setShowProfile(false); router.push("/admin"); }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Admin Settings
                    </button>
                  )}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={() => { setShowProfile(false); router.push("/login"); }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowSearch(false)}
          />
          <div className="relative w-full max-w-lg">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-900/10 overflow-hidden animate-slide-in-up">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks, projects, people..."
                  className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 bg-transparent border-0 outline-none"
                />
              </div>
              {searchQuery && (
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowSearch(false);
                      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
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

import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireSetup();
  const { q } = await searchParams;
  const query = q?.trim() || "";

  const tasks = query
    ? await prisma.task.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { issueKey: { contains: query } },
            { sheetCode: { contains: query } },
          ],
          column: {
            board: {
              project: {
                workspace: {
                  members: { some: { userId: session.user.id } },
                },
              },
            },
          },
        },
        include: {
          column: {
            select: {
              name: true,
              board: { select: { project: { select: { id: true, name: true, key: true } } } },
            },
          },
          assignee: { select: { name: true } },
        },
        take: 20,
      })
    : [];

  const projects = query
    ? await prisma.project.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { key: { contains: query } },
          ],
          workspace: {
            members: { some: { userId: session.user.id } },
          },
        },
        take: 10,
      })
    : [];

  const users = query
    ? await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { email: { contains: query } },
          ],
        },
        take: 10,
        select: { id: true, name: true, email: true, avatarUrl: true },
      })
    : [];

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        <p className="mt-1 text-sm text-gray-500">Global search across all issues and projects</p>
      </div>

      <form method="GET" action="/search" className="mb-6">
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search issues, projects, or people..."
            className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-12 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
          />
          {query && (
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800">
              Search
            </button>
          )}
        </div>
      </form>

      {!query ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-10 w-10 text-gray-300">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p className="mt-4 text-sm text-gray-500">Type to search</p>
        </div>
      ) : (
        <div className="space-y-8">
          {tasks.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Issues ({tasks.length})</h2>
              <div className="space-y-1">
                {tasks.map((t) => (
                  <Link
                    key={t.id}
                    href={`/project/${t.column.board.project.id}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${
                      t.priority === "CRITICAL" ? "bg-red-500" :
                      t.priority === "HIGH" ? "bg-orange-500" :
                      t.priority === "MEDIUM" ? "bg-blue-500" :
                      "bg-gray-400"
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {t.issueKey ? <span className="text-gray-400">{t.issueKey} </span> : null}
                        {t.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t.column.board.project.name} &middot; {t.column.name}
                        {t.assignee ? <span> &middot; {t.assignee.name}</span> : null}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Projects ({projects.length})</h2>
              <div className="space-y-1">
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/project/${p.id}/overview`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-600">
                      {p.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      {p.key && <p className="text-xs text-gray-400">{p.key}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {users.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">People ({users.length})</h2>
              <div className="space-y-1">
                {users.map((u) => (
                  <Link
                    key={u.id}
                    href={`/team/${u.id}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                      {u.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 && projects.length === 0 && users.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
              <p className="text-sm text-gray-500">No results found for &ldquo;{query}&rdquo;</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

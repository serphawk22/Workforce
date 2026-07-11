# TaskFlow → Employee Task Management System

## Goal
Transform this Jira clone into an Internal Employee Task Management System with Google Sheets as the sole source of truth, fixing all identified broken features first.

## Constraints
- Do not rewrite architecture, replace Prisma, NextAuth, or redesign the application.
- Reuse existing components wherever possible.
- Employee workflow: Admin creates accounts → first-login setup → employee dashboard → Google Sheets drives all task data.
- Employees must never manually create imported tasks.
- Google Sheets `Code` field is the external identifier for duplicate prevention.
- Enforce server-side authorization: employees see only their own data; admins see everything.

---

## Completed Work

### Bug Fixes
1. **Fix 1: Middleware** — Renamed `src/proxy.ts` → `src/middleware.ts`; added `/admin` to protected paths
2. **Fix 2: Dark Mode** — Created `ThemeProvider` client component with localStorage persistence; added FOUC-prevention inline script in root layout; updated `globals.css` for `.dark` class
3. **Fix 3: Kanban DnD** — Refactored `handleDragEnd` in `board.tsx` to be async with snapshot rollback
4. **Fix 4: Label Revalidation** — Fixed `removeTaskLabel` revalidation path from `/project/${taskId}` to `/project/${projectId}`
5. **Fix 5: Native Dialogs** — Replaced 9 `prompt()`/`confirm()`/`alert()` calls with state-based `ConfirmDialog`/`PromptDialog` in:
   - `board.tsx` (add column)
   - `column.tsx` (rename, delete)
   - `workspace-client.tsx` (delete project)
   - `sprint-sidebar.tsx` (complete sprint, delete sprint)
   - `task-detail-modal.tsx` (delete task)
   - `comment-section.tsx` (delete comment)
6. **Fix 6: Email** — Added dev-mode console fallback when `RESEND_API_KEY` is not set

### Google Sheets Integration
7. **Automatic Sync** — Created `GET /api/cron/sync` endpoint (protected by `Authorization: Bearer <CRON_SECRET>`); modified `syncGoogleSheet()` to accept a `userId` parameter for cron bypass
8. **Sync Access** — Changed `syncGoogleSheet` to require `requireAdmin()` instead of `requireAuth()` (only admins can trigger sync from UI)

### Dashboard Improvements
9. **Employee Dashboard** — Added Today's Tasks section, Overdue Tasks section, Upcoming Timeline with visual indicators, GitHub/Production URL link badges on all task items
10. **Admin Dashboard** — Added Quick Sync Now button, last sync status card (timestamp, duration, row counts), active employee count

### Team Page Improvements
11. **Public Team Page** — Cards are now clickable links to `/team/[employeeId]`; uses `Avatar` component (supports image URLs with colored initial fallback); added In Progress and Overdue stats (4-column grid); progress bar always visible (gray at 0%, green otherwise)
12. **Employee Detail Page** — Uses `Avatar` component; email is clickable `mailto:` link; progress bar always visible

### Authorization Enforcement
13. **Critical: sprint-queries.ts** — Added `requireAuth()` + workspace membership check to `getSprints()` and `getSprintWithTasks()`
14. **Critical: task-queries.ts** — Added `requireAuth()` + workspace membership check to `getTaskDetails()`
15. **Critical: API routes** — Added admin auth check to `GET /api/google-sheets/read` and `GET /api/google-sheets/test`
16. **High: column.ts** — Added workspace membership checks to `addColumn`, `renameColumn`, `deleteColumn`, `reorderColumns`
17. **High: task.ts** — Added workspace membership checks to `updateTask`, `moveTask`, `deleteTask`

---

## Files Changed (28 total)

### New Files
| File | Purpose |
|------|---------|
| `src/middleware.ts` | Route protection middleware (renamed from proxy.ts) |
| `src/components/theme-provider.tsx` | Dark mode client component |
| `src/components/ui/prompt-dialog.tsx` | Reusable dialog with text input |
| `src/components/dashboard/quick-sync-button.tsx` | Admin dashboard Sync Now button |
| `src/app/api/cron/sync/route.ts` | Cron sync endpoint |

### Modified Files
| File | Changes |
|------|---------|
| `src/app/layout.tsx` | Added FOUC prevention script, ThemeProvider wrapper |
| `src/app/globals.css` | Added `.dark` class selectors |
| `src/app/dashboard/page.tsx` | Added Today's Tasks, Overdue, Timeline sections, URL links |
| `src/app/admin/page.tsx` | Added Quick Sync button, last sync card, active employee count |
| `src/app/team/page.tsx` | Clickable cards, Avatar, In Progress/Overdue stats |
| `src/app/team/[employeeId]/page.tsx` | Avatar component, mailto email link |
| `src/components/board/board.tsx` | PromptDialog for add column, async rollback |
| `src/components/board/column.tsx` | PromptDialog/ConfirmDialog for rename/delete |
| `src/components/sprint/sprint-sidebar.tsx` | ConfirmDialog for complete/delete sprint |
| `src/components/task/task-detail-modal.tsx` | ConfirmDialog for delete task |
| `src/components/task/comment-section.tsx` | ConfirmDialog for delete comment |
| `src/app/workspace/[workspaceId]/workspace-client.tsx` | ConfirmDialog for delete project |
| `src/actions/label.ts` | Fixed revalidation path |
| `src/actions/profile.ts` / `src/app/profile/profile-form.tsx` | Live theme application on save |
| `src/lib/email.ts` | Dev-mode console fallback |
| `src/actions/sync.ts` | Accepts userId param, requireAdmin() instead of requireAuth() |
| `src/actions/sprint-queries.ts` | Added auth + membership check |
| `src/actions/task-queries.ts` | Added auth + membership check |
| `src/actions/task.ts` | Added membership check to update, move, delete |
| `src/actions/column.ts` | Added membership check to all functions |
| `src/app/api/google-sheets/read/route.ts` | Admin auth guard |
| `src/app/api/google-sheets/test/route.ts` | Admin auth guard |
| `.env` | Added `CRON_SECRET` |

---

## Remaining / Future Work

### Google Sheets as Source of Truth
- [ ] **Prevent manual task creation for employees** — Only admins should create tasks; employees work with imported sheet data
- [ ] **Sheet column mapping admin UI** — Allow admin to configure column headers via UI instead of hardcoded mapping
- [ ] **Sheet tab selector** — Let admin pick which sheet tab to sync
- [ ] **Deletion handling** — Archive or flag tasks removed from the sheet
- [ ] **Bidirectional sync** (optional) — Push status changes back to the sheet
- [ ] **Per-task last synced timestamp** — Add `lastSyncedAt` field to Task model

### Dashboard
- [ ] **Charts/visualizations** — Add bar/line charts for trends over time
- [ ] **Pagination on task lists** — For users with 100+ tasks

### Authorization
- [ ] **comment.ts** — Add workspace membership check to `addComment()`
- [ ] **label.ts** — Add workspace membership check to `createLabel`, `addTaskLabel`, `removeTaskLabel`
- [ ] **Project page error message** — Change "Project not found" to "Not authorized" for non-members
- [ ] **Team page data scoping** — Consider scoping employee visibility to shared workspaces only

### Deployment / Operations
- [ ] **Set up CRON_SECRET** — Generate a random secret for production
- [ ] **Configure Resend** — Set `RESEND_API_KEY` for email delivery
- [ ] **Set up Vercel Cron Jobs** or external cron service to hit `GET /api/cron/sync` every 10 minutes
- [ ] **Grant sheet access** — Share spreadsheet `155p-n9kA56BLOoMrMSwg7frWsNmcJJEfWqIDDHqr81w` with `taskflow-sync@taskflow-501813.iam.gserviceaccount.com`

### Application Redesign (Personal Work + Organization Management)
- [x] **Employee Nav** — Replaced "Team" link with "My Projects" link in `src/components/nav.tsx`
- [x] **Admin Nav** — Restructured into "My Work" (Dashboard, My Tasks, My Projects) and "Organization" (Team, All Tasks, All Projects, Google Sync, Analytics) groups in `src/app/admin/admin-nav.tsx`
- [x] **My Projects Page** — Created `src/app/my-projects/page.tsx` showing projects where the user has assigned tasks, with progress bars and task counts
- [x] **Admin All Tasks Page** — Created `src/app/admin/all-tasks/page.tsx` with client-side filters (search, project, employee, status, priority, category)
- [x] **Admin All Projects Page** — Created `src/app/admin/all-projects/page.tsx` with developer count, progress, and task breakdown
- [x] **Admin Analytics Page** — Created `src/app/admin/analytics/page.tsx` with status distribution, priority distribution, monthly activity (created vs completed), and top employees by task count
- [x] **Admin Dashboard** — Added "My Work" section at top (task stats, completion bar) + "Organization Overview" below in `src/app/admin/page.tsx`
- [x] **Security Hardening** — Changed `/team` and `/team/[employeeId]` from `requireSetup()` to `requireAdmin()` in both pages

### Google Sheets Mapping (current)
| Sheet Column | Maps To | Notes |
|-------------|---------|-------|
| `code` | `Task.sheetCode` | Unique identifier |
| `project` | `Project.name` | Find-or-create |
| `task` | `Task.title` | |
| `current state` | `Column.name` | Normalized: Done/In Progress/Review/To Do |
| `category` | `Label` | Find-or-create |
| `current owner` | `Task.assigneeId` | Matched by email or name |
| `requested by` | `Task.reporterId` | Matched by email or name |
| `competitor ` | Embedded in description | Trailing space in header |
| `github link` | `Task.githubLink` | |
| `Production URL` | `Task.productionUrl` | |
| `date of dev accept or start` | `Task.dateOfDevAcceptOrStart` | |
| `date of dev complete` | `Task.dateOfDevComplete` | |
| `date of qa or uat start` | `Task.dateOfQaOrUatStart` | |
| `date of qa or uat complete` | `Task.dateOfQaOrUatComplete` | |
| `date of release to prod` | `Task.dateOfReleaseToProd` | |

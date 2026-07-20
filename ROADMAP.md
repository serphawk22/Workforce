# TaskFlow → Jira-style Refactoring Roadmap

## Current State Summary

- **Routes**: `/dashboard` (employee), `/admin` (admin), `/my-tasks`, `/my-projects`, `/project/[id]`, `/admin/all-tasks`, `/admin/all-projects`, `/admin/analytics`, `/admin/workload`, `/admin/team`, `/team`, `/team/[id]`, `/profile`
- **Navs**: Two separate navs — `nav.tsx` (employee) and `admin-nav.tsx` (admin)
- **Auth**: Two roles — `EMPLOYEE`, `ADMIN` (hardcoded in Prisma)
- **Board**: DnD Kanban with dynamic columns per project
- **Task detail**: Right-side modal with edit/view toggle, timeline, comments
- **Google Sheets**: One-way sync, bidirectional partially built
- **Database**: Task has date fields but no issueKey, activity log, attachments, notifications

---

## Phase 0: Database Extensions (Add Prisma Models)

New models needed:

| Model | Fields | Purpose |
|-------|--------|---------|
| `ActivityLog` | id, taskId, userId, action, fieldName, oldValue, newValue, metadata, createdAt | Track all events chronologically |
| `Attachment` | id, taskId, fileName, fileSize, fileType, url, uploadedById, createdAt | File uploads |
| `Notification` | id, userId, type, title, message, taskId, read, createdAt | In-app notifications |
| Task model additions | `issueKey` (String?), `attachmentCount` (Int, computed) | Jira-style fields |

**Changes to existing models**:
- `Task`: Add `issueKey String? @unique`
- Generate issue keys like `PROJ-1`, `PROJ-2` etc. per project

---

## Phase 1: Unified Navigation (Single Jira-style Nav)

### What
Replace `nav.tsx` and `admin-nav.tsx` with a single `JiraNav` component.

### Layout
```
[Logo] Home | Your Work | Projects | Teams | Calendar | [Search]
[+ Create] [Notifications] [Avatar ▼]
```

Admin sees additionally on the right side (after a divider):
```
Administration | Users | Permissions | Google Sync
```

### How
- Create `src/components/jira-nav.tsx`
- All users see the same nav; admin items conditionally rendered
- Remove workspace selector from nav (or keep as secondary)
- Wire up admin nav layout (`/admin/*`) to use JiraNav
- Wire up non-admin layout (`/*`) to use JiraNav
- Remove `admin-nav.tsx`

### Files to create/modify
- NEW: `src/components/jira-nav.tsx`
- MODIFY: `src/app/(default)/layout.tsx` (use JiraNav)
- MODIFY: `src/app/admin/layout.tsx` (use JiraNav instead of AdminNav)
- DELETE: `src/components/nav.tsx`
- DELETE: `src/app/admin/admin-nav.tsx`

---

## Phase 2: Global Create Issue Dialog

### What
A reusable modal accessible from the nav bar via a "+" button.

### Features
- Select project (required)
- Summary (title, required)
- Description (optional)
- Issue Type — story/task/bug (optional, for future)
- Priority — Low/Medium/High/Critical
- Assignee — employee dropdown
- Labels — multi-select
- Sprint — dropdown
- Due Date — date picker

### Files
- Already exists: `src/components/task/create-task-modal.tsx` — needs enhancement
- MODIFY: `src/components/task/create-task-modal.tsx` — add project selector, issue type
- Integrate into JiraNav

---

## Phase 3: Activity Log System

### What
Create a `logActivity` utility and hook it into all task mutations.

### Actions to track
| Event | Where |
|-------|-------|
| Task created | `createTask()` |
| Task assigned | `createTask()`, `updateTask()` |
| Task reassigned | `reassignTask()` |
| Status changed | `updateTask()`, `moveTask()` |
| Priority changed | `updateTask()` |
| Comment added | `addComment()` |
| Attachment uploaded | New action |

### Files
- NEW: `src/lib/activity-log.ts` — `logActivity(taskId, userId, action, details)`
- MODIFY: `src/actions/task.ts` — add logging calls
- MODIFY: `src/actions/reassign.ts` — add logging calls
- MODIFY: `src/actions/comment.ts` — add logging calls

---

## Phase 4: Refactor Project Page → Jira Project

### What
Transform `/project/[projectId]` into a layout with tab navigation.

### Tabs
```
Overview | Board | Backlog | Timeline | Calendar | Reports | Members | Settings
```

Each tab is a sub-route: `/project/[projectId]/board`, `/project/[projectId]/backlog`, etc.

### How
- Create `src/app/project/[projectId]/layout.tsx` — tab nav + children
- Move current `page.tsx` to `/project/[projectId]/board/page.tsx`
- Create stub pages for other tabs
- The project layout renders the tab navigation bar

### Files
- NEW: `src/app/project/[projectId]/layout.tsx`
- MOVE: `page.tsx` → `src/app/project/[projectId]/board/page.tsx`
- NEW: `src/app/project/[projectId]/overview/page.tsx`
- NEW: `src/app/project/[projectId]/backlog/page.tsx` (reuse existing backlog page)
- NEW: `src/app/project/[projectId]/timeline/page.tsx`
- NEW: `src/app/project/[projectId]/calendar/page.tsx`
- NEW: `src/app/project/[projectId]/reports/page.tsx`
- NEW: `src/app/project/[projectId]/members/page.tsx`
- NEW: `src/app/project/[projectId]/settings/page.tsx`

---

## Phase 5: Jira-style Issue Drawer

### What
Enhance the existing `TaskDetailModal` to be a full-featured right-side drawer.

### Required enhancements
- Show Issue Key prominently (e.g., `PROJ-42`)
- Tabs: Details / Activity
- Details tab: Summary, Description, Status, Priority, Assignee, Reporter, Sprint, Due Date, Labels, GitHub Link, Production URL, Attachments
- Activity tab: Chronological feed of all events (from ActivityLog)
- Comments section at the bottom (already exists)
- Reassignment History section (already exists)
- Attachment upload UI

### Files
- MODIFY: `src/components/task/task-detail-modal.tsx` — major enhancement
- Consider renaming to `src/components/task/issue-drawer.tsx`

---

## Phase 6: Jira-style Kanban Board

### What
Standardize the Kanban board columns and enhance task cards.

### Default columns
```
To Do | In Progress | Review | Testing | Done
```

### Task card display
```
[PROJ-42]
Task Title
[Avatar] [Priority Dot] [Due Date]
[Label] [Label]
```

### Files
- MODIFY: `src/components/board/task-card.tsx` — add issue key, compact layout
- MODIFY: `src/components/board/column.tsx` — standardize columns
- MODIFY: `src/components/board/board.tsx` — enforce default columns

---

## Phase 7: Unified Home Page (Jira-style)

### What
Replace `src/app/dashboard/page.tsx` with a Jira-style "Your Work" home.

### Sections
- **Assigned to Me** — list of open tasks assigned to current user
- **Recent Activity** — activity feed across all projects
- **My Projects** — project cards with progress
- **Upcoming Deadlines** — tasks due in the next 7 days
- **Overdue Issues** — overdue tasks with red highlighting
- **Recent Notifications** — latest notifications

### Files
- MODIFY: `src/app/dashboard/page.tsx` — complete rewrite

---

## Phase 8: Your Work / My Tasks Enhancement

### What
Enhance `/my-tasks` page with Jira-style filters and issue key display.

### Files
- MODIFY: `src/app/my-tasks/page.tsx` — add filters, issue keys, bulk operations

---

## Phase 9: Team Page Refactoring

### What
Refactor team pages to Jira-style people view.

### Files
- MODIFY: `src/app/team/page.tsx` — Jira-style team listing
- MODIFY: `src/app/team/[employeeId]/page.tsx` — Jira-style profile

---

## Phase 10: Admin Area Refactoring

### What
Move admin pages under a proper administration section.

### New routes
- `/admin/users` — User management
- `/admin/permissions` — Roles & permissions
- `/admin/settings` — System settings
- `/admin/google-sync` — Google Sheets (keep existing, enhance)

### Files
- Keep existing admin pages, reorganize nav

---

## Phase 11: Google Sheets as Import/Export Tool

### What
Reposition Google Sheets sync as an import/export integration.

- Keep existing sync functionality
- Add "Import from Sheet" and "Export to Sheet" buttons
- Keep bidirectional sync (already partially built)
- Move from primary data source to secondary sync tool

### Files
- MODIFY: `src/actions/sync.ts` — add export functionality
- MODIFY: `src/app/admin/google-sync/page.tsx` — enhance UI

---

## Phase 12: Notification System

### What
Wire up the Notification model with real-time indicators.

### Triggers
- Task assigned to you
- Task reassigned
- Task completed
- You're mentioned in a comment

### Files
- NEW: `src/actions/notifications.ts`
- MODIFY: `src/lib/activity-log.ts` — create notifications alongside activity logs
- MODIFY: `src/components/jira-nav.tsx` — notification bell with count

---

## Implementation Order

```
Phase 0 (Database) → Phase 3 (Activity Log) → Phase 1 (Nav) → Phase 7 (Home)
→ Phase 2 (Create Dialog) → Phase 5 (Issue Drawer) → Phase 6 (Kanban)
→ Phase 4 (Project Tabs) → Phase 8 (My Tasks) → Phase 9 (Teams)
→ Phase 10 (Admin) → Phase 11 (Sheets) → Phase 12 (Notifications)
```

**Dependency rationale**: 
- DB changes must come first
- Activity log must exist before issue drawer can display it
- Nav must be unified before home page redesign
- Home page needs activity log
- Create dialog needs to know where to redirect (project page with tabs)
- Issue drawer enhancements depend on activity log
- Project tabs depend on issue drawer being complete

---

## What We Preserve (Do NOT Change)

- ✅ Next.js App Router structure
- ✅ Prisma + SQLite
- ✅ NextAuth with JWT strategy
- ✅ Server Actions pattern
- ✅ Tailwind CSS styling
- ✅ All existing data (migrations additive only)
- ✅ Google Sheets integration code
- ✅ DnD Kanban functionality
- ✅ Existing API routes
- ✅ Dark mode support
- ✅ All existing auth/membership checks

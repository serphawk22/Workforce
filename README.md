# TaskFlow

A full-stack Jira-like project management web app built with Next.js 16 (App Router), TypeScript, PostgreSQL, Prisma, NextAuth, and TailwindCSS.

## Features

- **Auth**: Register/login with email & password via NextAuth Credentials provider (JWT sessions)
- **Workspaces**: Create workspaces, invite members (by email, with pending invites for unregistered users)
- **Projects**: Create/edit/delete projects within a workspace
- **Kanban Board**: Drag & drop tasks between columns and reorder within columns using @dnd-kit
- **Tasks**: Create, edit, delete tasks with title, description, priority, assignee, due date, labels
- **Comments**: Add/delete comments on tasks
- **Search & Filters**: Filter board by assignee, priority, label; text search by task title
- **Dashboard**: Overview of tasks assigned to you, overdue tasks, recently updated tasks
- **My Tasks**: All tasks assigned to you across all workspaces

## Prerequisites

- Node.js 20.9+
- PostgreSQL running locally (or a remote PostgreSQL URL)

## Getting Started

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskflow"
NEXTAUTH_SECRET="generate-a-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a secure NEXTAUTH_SECRET:

```bash
openssl rand -base64 32
```

### 3. Set up the database

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

This creates all tables and seeds with demo data.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo credentials

- **Email**: `demo@taskflow.dev`
- **Password**: `password123`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed the database |
| `npm run db:reset` | Reset and re-seed the database |

## Architecture

- **Server Components** for initial data loads (dashboard, workspace, project pages)
- **Client Components** for interactivity (board drag & drop, task modals, forms)
- **Server Actions** for all mutations (create/update/delete tasks, comments, etc.)
- **URL search params** for board filtering (assignee, priority, label, search)
- **Prisma** directly in Server Components and Server Actions (no REST API layer)
- **@dnd-kit** for drag & drop with optimistic UI updates

## Project Structure

```
src/
├── actions/           # Server Actions (workspace, project, task, column, comment, label)
├── app/
│   ├── (auth)/        # Login, Register pages
│   ├── api/auth/      # NextAuth route handler
│   ├── dashboard/     # Dashboard page
│   ├── my-tasks/      # My Tasks page
│   ├── workspace/     # Workspace detail page
│   └── project/       # Project board page
├── components/
│   ├── board/         # Board, Column, TaskCard (DnD)
│   ├── task/          # TaskDetailModal, CommentSection
│   └── nav.tsx        # Top navigation
├── lib/
│   ├── prisma.ts      # Prisma client
│   ├── auth.ts        # NextAuth config
│   ├── schemas.ts     # Zod validation schemas
│   └── auth-helpers.ts # Auth helpers
├── proxy.ts           # Auth proxy (replaces middleware)
└── types/             # NextAuth type augmentation
```

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- PostgreSQL + Prisma ORM
- NextAuth.js (Credentials provider, JWT)
- TailwindCSS
- @dnd-kit (drag & drop)
- Zod (validation)
- bcryptjs (password hashing)

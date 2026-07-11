"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { requireAdmin } from "@/lib/authorization";
import { readSheet } from "@/lib/google-sheets";
import { mapRow } from "@/lib/googleSheetMapper";

export type SyncMatchLogEntry = {
  ownerName: string;
  matched: boolean;
  matchedUserName: string | null;
  taskCount: number;
};

export type SyncResult = {
  success: boolean;
  rowsRead: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsReassigned: number;
  rowsSkipped: number;
  rowsFailed: number;
  duration: string;
  error?: string;
  unmappedOwners: string[];
  matchLog: SyncMatchLogEntry[];
};

const SYNC_WORKSPACE_NAME = "Google Sync";

const DEFAULT_COLUMNS = ["To Do", "In Progress", "Review", "Done"];

function parseSheetDate(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export async function syncGoogleSheet(userId?: string): Promise<SyncResult> {
  const startedAt = new Date();
  let rowsRead = 0;
  let rowsCreated = 0;
  let rowsUpdated = 0;
  let rowsReassigned = 0;
  let rowsSkipped = 0;
  let rowsFailed = 0;

  try {
    const session = userId ? null : await requireAdmin();
    const defaultReporterId = userId ?? session!.user.id;

    const data = await readSheet();

    rowsRead = data.rows.length;

    const workspace = await findOrCreateWorkspace(defaultReporterId);

    const projectCache = new Map<string, string>();
    const columnCache = new Map<string, string>();
    const labelCache = new Map<string, string>();
    const userCache = new Map<string, string | null>();
    const unmappedOwners = new Set<string>();
    const ownerMatchCounts = new Map<string, {
      matched: boolean;
      matchedUserId: string | null;
      matchedUserName: string | null;
      count: number;
    }>();

    for (const raw of data.rows) {
      try {
        const mapped = mapRow(raw);
        if (!mapped) {
          rowsSkipped++;
          continue;
        }

        const projectId = await findOrCreateProject(
          workspace.id,
          mapped.projectName,
          projectCache
        );

        const columnId = await findOrCreateColumn(
          projectId,
          mapped.state,
          columnCache
        );

        let labelId: string | null = null;
        if (mapped.category) {
          labelId = await findOrCreateLabel(
            projectId,
            mapped.category,
            labelCache
          );
        }

        const assigneeId = await lookupUser(mapped.assigneeName, userCache);
        const reporterId = await lookupUser(mapped.reporterName, userCache);

        if (!assigneeId && mapped.assigneeName) {
          unmappedOwners.add(mapped.assigneeName);
        }

        if (mapped.assigneeName) {
          const existing = ownerMatchCounts.get(mapped.assigneeName);
          if (existing) {
            existing.count++;
          } else {
            ownerMatchCounts.set(mapped.assigneeName, {
              matched: !!assigneeId,
              matchedUserId: assigneeId,
              matchedUserName: assigneeId ? mapped.assigneeName : null,
              count: 1,
            });
          }
        }

        const existing = await prisma.task.findUnique({
          where: { sheetCode: mapped.sheetCode },
          include: { labels: true },
        });

        const taskData = {
          title: mapped.title,
          description: mapped.description || null,
          assigneeId: assigneeId ?? null,
          reporterId: reporterId ?? defaultReporterId,
          originalOwner: mapped.assigneeName || null,
          category: mapped.category || null,
          githubLink: mapped.githubLink || null,
          productionUrl: mapped.productionUrl || null,
          dateOfDevAcceptOrStart: parseSheetDate(mapped.dateOfDevAcceptOrStart),
          dateOfDevComplete: parseSheetDate(mapped.dateOfDevComplete),
          dateOfQaOrUatStart: parseSheetDate(mapped.dateOfQaOrUatStart),
          dateOfQaOrUatComplete: parseSheetDate(mapped.dateOfQaOrUatComplete),
          dateOfReleaseToProd: parseSheetDate(mapped.dateOfReleaseToProd),
        };

        if (existing) {
          const changed: Record<string, unknown> = {};
          if (existing.title !== mapped.title) changed.title = mapped.title;
          if ((existing.description ?? "") !== mapped.description)
            changed.description = mapped.description || null;
          if (existing.columnId !== columnId) changed.columnId = columnId;
          if (existing.assigneeId !== (assigneeId ?? null)) {
            changed.assigneeId = assigneeId ?? null;
          }
          if (existing.reporterId !== (reporterId ?? defaultReporterId))
            changed.reporterId = reporterId ?? defaultReporterId;
          if ((existing.category ?? "") !== (taskData.category ?? ""))
            changed.category = taskData.category;
          if ((existing.githubLink ?? "") !== (taskData.githubLink ?? ""))
            changed.githubLink = taskData.githubLink;
          if ((existing.productionUrl ?? "") !== (taskData.productionUrl ?? ""))
            changed.productionUrl = taskData.productionUrl;

          for (const dateField of ["dateOfDevAcceptOrStart", "dateOfDevComplete", "dateOfQaOrUatStart", "dateOfQaOrUatComplete", "dateOfReleaseToProd"] as const) {
            const existingVal = existing[dateField]?.getTime() ?? null;
            const newVal = taskData[dateField]?.getTime() ?? null;
            if (existingVal !== newVal) {
              (changed as Record<string, unknown>)[dateField] = taskData[dateField];
            }
          }

          const wasReassigned = "assigneeId" in changed;
          if (Object.keys(changed).length > 0) {
            await prisma.task.update({
              where: { id: existing.id },
              data: { ...changed, originalOwner: mapped.assigneeName || null },
            });
            rowsUpdated++;
            if (wasReassigned) rowsReassigned++;
          } else {
            rowsSkipped++;
          }

          if (labelId) {
            const hasLabel = existing.labels.some(
              (l) => l.labelId === labelId
            );
            if (!hasLabel) {
              await prisma.taskLabel.create({
                data: { taskId: existing.id, labelId },
              });
            }
          }
        } else {
          const maxOrder = await prisma.task.aggregate({
            where: { columnId },
            _max: { order: true },
          });

          await prisma.task.create({
            data: {
              columnId,
              ...taskData,
              sheetCode: mapped.sheetCode,
              order: (maxOrder._max.order ?? -1) + 1,
              labels: labelId
                ? { create: { labelId } }
                : undefined,
            },
          });
          rowsCreated++;
        }
      } catch {
        rowsFailed++;
      }
    }

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    const matchLog: SyncMatchLogEntry[] = Array.from(ownerMatchCounts.entries())
      .map(([ownerName, info]) => ({
        ownerName,
        matched: info.matched,
        matchedUserName: info.matchedUserName,
        taskCount: info.count,
      }))
      .sort((a, b) => b.taskCount - a.taskCount);

    await prisma.syncLog.create({
      data: {
        startedAt,
        finishedAt,
        rowsRead,
        rowsCreated,
        rowsUpdated,
        rowsReassigned,
        rowsSkipped,
        rowsFailed,
      },
    });

    revalidatePath("/admin/google-sync");
    return {
      success: true,
      rowsRead,
      rowsCreated,
      rowsUpdated,
      rowsReassigned,
      rowsSkipped,
      rowsFailed,
      duration: formatDuration(durationMs),
      unmappedOwners: Array.from(unmappedOwners).sort(),
      matchLog,
    };
  } catch (error) {
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    const message =
      error instanceof Error ? error.message : "Unknown error";

    await prisma.syncLog.create({
      data: {
        startedAt,
        finishedAt,
        rowsRead,
        rowsCreated,
        rowsUpdated,
        rowsReassigned,
        rowsSkipped,
        rowsFailed,
        error: message,
      },
    });

    revalidatePath("/admin/google-sync");
    return {
      success: false,
      rowsRead,
      rowsCreated,
      rowsUpdated,
      rowsReassigned,
      rowsSkipped,
      rowsFailed,
      duration: formatDuration(durationMs),
      error: message,
      unmappedOwners: [],
      matchLog: [],
    };
  }
}

async function findOrCreateWorkspace(ownerId: string) {
  const existing = await prisma.workspace.findFirst({
    where: { name: SYNC_WORKSPACE_NAME, ownerId },
  });
  if (existing) return existing;

  return prisma.workspace.create({
    data: {
      name: SYNC_WORKSPACE_NAME,
      ownerId,
      members: {
        create: { userId: ownerId, role: "OWNER" },
      },
    },
  });
}

async function findOrCreateProject(
  workspaceId: string,
  name: string,
  cache: Map<string, string>
): Promise<string> {
  const cacheKey = `${workspaceId}:${name}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let project = await prisma.project.findFirst({
    where: { workspaceId, name },
    include: { boards: { include: { columns: true } } },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        name,
        workspaceId,
        boards: {
          create: {
            name: "Main Board",
            columns: {
              create: DEFAULT_COLUMNS.map((col, i) => ({
                name: col,
                order: i,
              })),
            },
          },
        },
      },
      include: { boards: { include: { columns: true } } },
    });
  }

  cache.set(cacheKey, project.id);
  return project.id;
}

async function findOrCreateColumn(
  projectId: string,
  state: string,
  cache: Map<string, string>
): Promise<string> {
  const cacheKey = `${projectId}:${state}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const board = await prisma.board.findUnique({
    where: { projectId },
    include: { columns: true },
  });

  if (!board) {
    const newBoard = await prisma.board.create({
      data: {
        projectId,
        columns: {
          create: DEFAULT_COLUMNS.map((col, i) => ({
            name: col,
            order: i,
          })),
        },
      },
      include: { columns: true },
    });

    const col = newBoard.columns.find((c) => c.name === state);
    if (col) {
      cache.set(cacheKey, col.id);
      return col.id;
    }
    cache.set(cacheKey, newBoard.columns[0].id);
    return newBoard.columns[0].id;
  }

  let column = board.columns.find((c) => c.name === state);
  if (!column) {
    column = await prisma.column.create({
      data: {
        boardId: board.id,
        name: state,
        order: board.columns.length,
      },
    });
  }

  cache.set(cacheKey, column.id);
  return column.id;
}

async function findOrCreateLabel(
  projectId: string,
  category: string,
  cache: Map<string, string>
): Promise<string> {
  const cacheKey = `${projectId}:${category}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const color = labelColor(category);

  let label = await prisma.label.findFirst({
    where: { projectId, name: category },
  });

  if (!label) {
    label = await prisma.label.create({
      data: { projectId, name: category, color },
    });
  }

  cache.set(cacheKey, label.id);
  return label.id;
}

async function lookupUser(
  name: string,
  cache: Map<string, string | null>
): Promise<string | null> {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const cached = cache.get(trimmed);
  if (cached !== undefined) return cached;

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: trimmed },
        { name: trimmed },
      ],
    },
  });

  cache.set(trimmed, user?.id ?? null);
  return user?.id ?? null;
}

function labelColor(category: string): string {
  const colors = [
    "#2563EB",
    "#059669",
    "#D97706",
    "#DC2626",
    "#7C3AED",
    "#DB2777",
    "#0891B2",
    "#65A30D",
  ];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

import { prisma } from "@/lib/prisma";

export async function generateNextTaskCode(): Promise<string> {
  const tasks = await prisma.task.findMany({
    where: { code: { not: null }, parentTaskId: null },
    select: { code: true },
  });

  let maxNum = 0;
  for (const t of tasks) {
    if (t.code && /^\d+$/.test(t.code)) {
      const n = parseInt(t.code, 10);
      if (n > maxNum) maxNum = n;
    }
  }

  return String(maxNum + 1);
}

export async function generateNextChildTaskCode(parentCode: string): Promise<string> {
  const childTasks = await prisma.task.findMany({
    where: { code: { not: null }, parentTask: { code: parentCode } },
    select: { code: true },
  });

  const prefix = `${parentCode}.`;
  let maxSuffix = 0;
  for (const t of childTasks) {
    if (t.code && t.code.startsWith(prefix)) {
      const suffix = t.code.slice(prefix.length);
      if (/^\d+$/.test(suffix)) {
        const n = parseInt(suffix, 10);
        if (n > maxSuffix) maxSuffix = n;
      }
    }
  }

  return `${parentCode}.${maxSuffix + 1}`;
}

export async function generateNextSubtaskCode(taskCode: string): Promise<string> {
  const subtasks = await prisma.subtask.findMany({
    where: { code: { not: null } },
    select: { code: true },
  });

  const prefix = `${taskCode}_`;
  let maxSuffix = -1;
  for (const s of subtasks) {
    if (s.code && s.code.startsWith(prefix)) {
      const suffix = s.code.slice(prefix.length);
      if (/^\d+$/.test(suffix)) {
        const n = parseInt(suffix, 10);
        if (n > maxSuffix) maxSuffix = n;
      }
    }
  }

  return `${taskCode}_${maxSuffix + 1}`;
}

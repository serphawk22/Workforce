export function generateAISummary(params: {
  taskTitle?: string | null;
  subtaskTitle?: string | null;
  todayWork: string;
  tomorrowTask: string;
  timeSpent: number;
  status: string;
  blockers?: string | null;
  githubLink?: string | null;
  productionUrl?: string | null;
}): string {
  const parts: string[] = [];

  const todayLines = params.todayWork
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (todayLines.length > 0) {
    const bulletPoints = todayLines.filter((l) => l.startsWith("-") || l.startsWith("•"));
    if (bulletPoints.length >= 2) {
      const tasks = bulletPoints.map((b) => b.replace(/^[-•]\s*/, "").replace(/\.$/, ""));
      const joined = tasks.slice(0, -1).join(", ") + ", and " + tasks.slice(-1);
      parts.push(joined);
    } else {
      parts.push(todayLines.join("; ").replace(/\.$/, ""));
    }
  }

  if (params.blockers?.trim()) {
    parts.push(`Blocked by: ${params.blockers.trim()}`);
  } else {
    parts.push("No blockers");
  }

  if (params.tomorrowTask.trim()) {
    const tomorrow = params.tomorrowTask
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)[0];
    if (tomorrow) {
      parts.push(`Next: ${tomorrow.replace(/\.$/, "")}`);
    }
  }

  let summary = parts.join(". ") + ".";
  summary = summary.charAt(0).toUpperCase() + summary.slice(1);
  return summary;
}

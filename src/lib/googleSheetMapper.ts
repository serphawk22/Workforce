const STATE_COLUMN_MAP: Record<string, string> = {
  done: "Done",
  completed: "Done",
  closed: "Done",
  released: "Done",
  started: "In Progress",
  "in progress": "In Progress",
  working: "In Progress",
  "in dev": "In Progress",
  review: "Review",
  qa: "Review",
  uat: "Review",
  "in review": "Review",
  todo: "To Do",
  open: "To Do",
  "not started": "To Do",
  backlog: "To Do",
};

export interface SheetRow {
  project: string;
  taskNum: string;
  code: string;
  competitor: string;
  category: string;
  task: string;
  githubLink: string;
  productionUrl: string;
  currentState: string;
  requestedDate: string;
  requestedBy: string;
  ageSinceToday: string;
  currentOwnerRole: string;
  currentOwner: string;
  dateOfDevAcceptOrStart: string;
  dateOfDevComplete: string;
  durationInDev: string;
  dateOfQaOrUatStart: string;
  dateOfQaOrUatComplete: string;
  durationInQaOrUat: string;
  dateOfReleaseToProd: string;
  durationOfRequestToProdRelease: string;
}

export interface MappedRow {
  projectName: string;
  sheetCode: string;
  title: string;
  description: string;
  state: string;
  category: string;
  assigneeName: string;
  reporterName: string;
  competitor: string;
}

function trim(value: string): string {
  return (value ?? "").trim();
}

export function mapRow(raw: Record<string, string>): MappedRow | null {
  const sheetCode = trim(raw["code"]);
  const fallbackKey = `${trim(raw["project"])}_${trim(raw["task num"])}`;
  const uniqueCode = sheetCode || fallbackKey;

  if (!uniqueCode) return null;

  const title = trim(raw["task"]);
  if (!title) return null;

  const state = normalizeState(trim(raw["current state"]));

  const description = buildDescription(raw);

  return {
    projectName: trim(raw["project"]) || "Unnamed Project",
    sheetCode: uniqueCode,
    title,
    description,
    state,
    category: trim(raw["category"]),
    assigneeName: trim(raw["current owner"]),
    reporterName: trim(raw["requested by"]),
    competitor: trim(raw["competitor "]),
  };
}

function normalizeState(raw: string): string {
  const key = raw.toLowerCase();
  return STATE_COLUMN_MAP[key] || "To Do";
}

function buildDescription(raw: Record<string, string>): string {
  const parts: string[] = [];

  const github = trim(raw["github link"]);
  if (github) parts.push(`GitHub: ${github}`);

  const prodUrl = trim(raw["Production URL"]);
  if (prodUrl) parts.push(`Production URL: ${prodUrl}`);

  const competitor = trim(raw["competitor "]);
  if (competitor) parts.push(`Competitor: ${competitor}`);

  const requestedDate = trim(raw["requested date"]);
  if (requestedDate) parts.push(`Requested: ${requestedDate}`);

  const role = trim(raw["current owner role"]);
  if (role) parts.push(`Owner Role: ${role}`);

  return parts.join("\n");
}

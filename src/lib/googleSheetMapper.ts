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
  pending: "To Do",
  testing: "Testing",
  "in testing": "Testing",
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
  githubLink: string;
  productionUrl: string;
  dateOfDevAcceptOrStart: string;
  dateOfDevComplete: string;
  dateOfQaOrUatStart: string;
  dateOfQaOrUatComplete: string;
  dateOfReleaseToProd: string;
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
    githubLink: trim(raw["github link"]),
    productionUrl: trim(raw["Production URL"]),
    dateOfDevAcceptOrStart: trim(raw["date of dev accept or start"]),
    dateOfDevComplete: trim(raw["date of dev complete"]),
    dateOfQaOrUatStart: trim(raw["date of qa or uat start"]),
    dateOfQaOrUatComplete: trim(raw["date of qa or uat complete"]),
    dateOfReleaseToProd: trim(raw["date of release to prod"]),
  };
}

function normalizeState(raw: string): string {
  const key = raw.toLowerCase();
  return STATE_COLUMN_MAP[key] || "To Do";
}

function buildDescription(raw: Record<string, string>): string {
  const parts: string[] = [];

  const competitor = trim(raw["competitor "]);
  if (competitor) parts.push(`Competitor: ${competitor}`);

  const requestedDate = trim(raw["requested date"]);
  if (requestedDate) parts.push(`Requested: ${requestedDate}`);

  const role = trim(raw["current owner role"]);
  if (role) parts.push(`Owner Role: ${role}`);

  return parts.join("\n");
}

import { z } from "zod";

const issueTypes = ["EPIC", "TASK", "STORY", "BUG", "FEATURE_REQUEST", "IMPROVEMENT", "SUBTASK"] as const;

export const createTaskSchema = z.object({
  columnId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(issueTypes).optional(),
  epicId: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  assigneeId: z.string().optional(),
  reporterId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  labelIds: z.array(z.string()).optional(),
  sprintId: z.string().optional(),
  projectId: z.string().optional(),
  githubLink: z.string().optional(),
  productionUrl: z.string().optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  id: z.string(),
});

export const moveTaskSchema = z.object({
  taskId: z.string(),
  newColumnId: z.string(),
  newOrder: z.number().int().min(0),
});

export const addColumnSchema = z.object({
  boardId: z.string(),
  name: z.string().min(1).max(50),
});

export const reorderColumnsSchema = z.object({
  boardId: z.string(),
  columnIds: z.array(z.string()),
});

export const createLabelSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(30),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const addCommentSchema = z.object({
  taskId: z.string(),
  content: z.string().min(1).max(2000),
});

export const createProjectSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export const updateProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  workspaceId: z.string(),
});

export const removeMemberSchema = z.object({
  workspaceId: z.string(),
  userId: z.string(),
});

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export const createSprintSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(100),
  goal: z.string().max(500).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const updateSprintSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  goal: z.string().max(500).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
});

export const assignTaskToSprintSchema = z.object({
  taskId: z.string(),
  sprintId: z.string().nullable(),
});

export const removeTaskFromSprintSchema = z.object({
  taskId: z.string(),
});

export const updateProfileSettingsSchema = z.object({
  displayName: z.string().max(100).optional(),
  password: z.string().min(6).max(100).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  themePreference: z.enum(["light", "dark"]).optional(),
  notificationPreferences: z.string().optional(),
});



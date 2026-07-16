import { z } from "zod";

// Mirrors prisma/schema.prisma enums — keep in sync.

export const taskTypeSchema = z.enum(["TASK", "BUG"]);
export const taskStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
  "DONE",
]);
export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const clientStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);
export const projectStatusSchema = z.enum([
  "PLANNED",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "ARCHIVED",
]);

export type TaskType = z.infer<typeof taskTypeSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type ClientStatus = z.infer<typeof clientStatusSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

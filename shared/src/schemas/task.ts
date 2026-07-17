import { z } from "zod";
import {
  taskPrioritySchema,
  taskStatusSchema,
  taskTypeSchema,
} from "../enums";

export const createTaskSchema = z.object({
  type: taskTypeSchema.default("TASK"),
  clientId: z.string().min(1, "Client is required"),
  projectId: z.string().optional(),
  title: z.string().min(1, "Title is required").max(191),
  description: z.string().max(20000).optional(),
  category: z.string().max(100).optional(),
  priority: taskPrioritySchema.default("MEDIUM"),
  status: taskStatusSchema.default("TODO"),
  assigneeIds: z
    .array(z.string())
    .min(1, "Assign at least one person")
    .max(10, "At most 10 assignees"),
  estimatedHours: z.coerce.number().min(0).max(9999).optional(),
  dueDate: z.coerce.date().optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  actualHours: z.coerce.number().min(0).max(9999).optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
  boardOrder: z.coerce.number().int().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

import { z } from "zod";
import { projectStatusSchema } from "../enums";

export const createProjectSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  name: z.string().min(1, "Project name is required").max(191),
  description: z.string().max(10000).optional(),
  status: projectStatusSchema.default("ACTIVE"),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

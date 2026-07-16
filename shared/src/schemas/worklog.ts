import { z } from "zod";

export const createWorkLogSchema = z.object({
  workDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"), // plain date, user's timezone
  taskId: z.string().optional(),
  clientId: z.string().optional(),
  description: z.string().min(1, "Describe what you worked on").max(5000),
  hours: z.coerce
    .number()
    .min(0.25, "Log at least 15 minutes")
    .max(24, "A day has only 24 hours"),
});

export const updateWorkLogSchema = createWorkLogSchema.partial();

export type CreateWorkLogInput = z.infer<typeof createWorkLogSchema>;
export type UpdateWorkLogInput = z.infer<typeof updateWorkLogSchema>;

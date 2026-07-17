import { z } from "zod";
import { clientStatusSchema } from "../enums";

export const createClientSchema = z.object({
  name: z.string().min(1, "Client name is required").max(191),
  companyName: z.string().max(191).optional(),
  email: z.email("Enter a valid email").optional(),
  phone: z.string().max(20).optional(),
  status: clientStatusSchema.default("ACTIVE"),
  notes: z.string().max(5000).optional(),
  accountManagerId: z.string().nullable().optional(),
});

// declared without defaults — see task.ts note on zod v4 partials
export const updateClientSchema = z.object({
  name: z.string().min(1, "Client name is required").max(191).optional(),
  companyName: z.string().max(191).nullable().optional(),
  email: z.email("Enter a valid email").nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  status: clientStatusSchema.optional(),
  notes: z.string().max(5000).nullable().optional(),
  accountManagerId: z.string().nullable().optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

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

export const updateClientSchema = createClientSchema.partial();

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

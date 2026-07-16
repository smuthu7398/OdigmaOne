import { z } from "zod";

/**
 * API conventions (see docs/API_Conventions.md):
 * every /api/v1 response is one of these two envelopes.
 */

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: PaginationMeta;
};

export type ApiError = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(), // e.g. "dueDate" or "-createdAt"
  q: z.string().optional(), // free-text search
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

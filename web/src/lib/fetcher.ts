import type { ApiResponse, PaginationMeta } from "@odigma/shared";

export class ApiRequestError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

/** Fetch an /api/v1 endpoint and unwrap the response envelope. */
export async function api<T>(
  url: string,
  init?: RequestInit
): Promise<{ data: T; meta?: PaginationMeta }> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body = (await res.json()) as ApiResponse<T>;
  if (!body.success) {
    throw new ApiRequestError(
      body.error.code,
      body.error.message,
      body.error.details
    );
  }
  return { data: body.data, meta: body.meta };
}

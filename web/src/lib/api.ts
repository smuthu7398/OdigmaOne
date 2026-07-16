import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { ApiError, ApiSuccess, PaginationMeta } from "@odigma/shared";

// Response helpers implementing docs/API_Conventions.md — every /api/v1
// handler responds through one of these.

export function ok<T>(data: T, meta?: PaginationMeta, status = 200) {
  const body: ApiSuccess<T> = { success: true, data, ...(meta && { meta }) };
  return NextResponse.json(body, { status });
}

export function created<T>(data: T) {
  return ok(data, undefined, 201);
}

export function fail(
  status: number,
  code: string,
  message: string,
  details?: unknown
) {
  const body: ApiError = {
    success: false,
    error: { code, message, ...(details !== undefined && { details }) },
  };
  return NextResponse.json(body, { status });
}

export const unauthorized = () => fail(401, "UNAUTHORIZED", "Sign in required");
export const forbidden = () =>
  fail(403, "FORBIDDEN", "You don't have permission to do this");
export const notFound = (what = "Resource") =>
  fail(404, "NOT_FOUND", `${what} not found`);

export function validationError(err: ZodError) {
  return fail(400, "VALIDATION_ERROR", "Invalid input", err.flatten());
}

export function internalError(err: unknown) {
  console.error("[api] internal error:", err);
  return fail(500, "INTERNAL", "Something went wrong");
}

export function pageMeta(
  page: number,
  pageSize: number,
  total: number
): PaginationMeta {
  return { page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

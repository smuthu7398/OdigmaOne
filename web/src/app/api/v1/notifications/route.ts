import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { internalError, ok, pageMeta, validationError } from "@/lib/api";
import { paginationQuerySchema } from "@odigma/shared";

export async function GET(request: NextRequest) {
  const { user, error } = await requirePermission("notification:read");
  if (error) return error;

  const parsed = paginationQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) return validationError(parsed.error);
  const { page, pageSize } = parsed.data;

  try {
    const where = { userId: user.id };
    const [items, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    return ok({ items, unread }, pageMeta(page, pageSize, total));
  } catch (err) {
    return internalError(err);
  }
}

/** PATCH marks notifications read: {ids: [...]} or {all: true} */
export async function PATCH(request: NextRequest) {
  const { user, error } = await requirePermission("notification:read");
  if (error) return error;

  try {
    const body = (await request.json()) as { ids?: string[]; all?: boolean };
    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        readAt: null,
        ...(body.all ? {} : { id: { in: body.ids ?? [] } }),
      },
      data: { readAt: new Date() },
    });
    return ok({ done: true });
  } catch (err) {
    return internalError(err);
  }
}

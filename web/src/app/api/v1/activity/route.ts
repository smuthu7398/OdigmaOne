import { NextRequest } from "next/server";
import { paginationQuerySchema } from "@odigma/shared";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { internalError, ok, pageMeta, validationError } from "@/lib/api";
import { z } from "zod";

const listQuerySchema = paginationQuerySchema.extend({
  entityType: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { error } = await requirePermission("activity:read");
  if (error) return error;

  const parsed = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) return validationError(parsed.error);
  const { page, pageSize, entityType } = parsed.data;

  try {
    const where = entityType ? { entityType } : {};
    const [items, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { actor: { select: { id: true, name: true } } },
      }),
      prisma.activity.count({ where }),
    ]);
    return ok(items, pageMeta(page, pageSize, total));
  } catch (err) {
    return internalError(err);
  }
}

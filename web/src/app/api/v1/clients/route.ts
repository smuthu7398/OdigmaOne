import { NextRequest } from "next/server";
import { createClientSchema, paginationQuerySchema } from "@odigma/shared";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import {
  created,
  internalError,
  ok,
  pageMeta,
  validationError,
} from "@/lib/api";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";

const listQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

export async function GET(request: NextRequest) {
  const { user, error } = await requirePermission("client:read");
  if (error) return error;

  const parsed = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) return validationError(parsed.error);
  const { page, pageSize, q, sort, status } = parsed.data;

  try {
    const where: Prisma.ClientWhereInput = {
      deletedAt: null,
      ...(user.clientId && { id: user.clientId }), // client-portal row scope
      ...(status && { status }),
      ...(q && {
        OR: [
          { name: { contains: q } },
          { companyName: { contains: q } },
          { email: { contains: q } },
        ],
      }),
    };

    const orderBy: Prisma.ClientOrderByWithRelationInput = sort
      ? { [sort.replace(/^-/, "")]: sort.startsWith("-") ? "desc" : "asc" }
      : { createdAt: "desc" };

    const [items, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { projects: true, tasks: true } } },
      }),
      prisma.client.count({ where }),
    ]);

    return ok(items, pageMeta(page, pageSize, total));
  } catch (err) {
    return internalError(err);
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = await requirePermission("client:create");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(new z.ZodError([]));
  }
  const parsed = createClientSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const client = await prisma.client.create({ data: parsed.data });
    await logActivity({
      actorId: user.id,
      entityType: "client",
      entityId: client.id,
      action: "created",
      meta: { name: client.name },
    });
    return created(client);
  } catch (err) {
    return internalError(err);
  }
}

import { NextRequest } from "next/server";
import { createProjectSchema, paginationQuerySchema } from "@odigma/shared";
import { prisma } from "@/lib/prisma";
import { clientScope, requirePermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import {
  created,
  internalError,
  notFound,
  ok,
  pageMeta,
  validationError,
} from "@/lib/api";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";

const listQuerySchema = paginationQuerySchema.extend({
  clientId: z.string().optional(),
  status: z
    .enum(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"])
    .optional(),
});

export async function GET(request: NextRequest) {
  const { user, error } = await requirePermission("project:read");
  if (error) return error;

  const parsed = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) return validationError(parsed.error);
  const { page, pageSize, q, sort, clientId, status } = parsed.data;

  try {
    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...clientScope(user), // portal users: own client only
      ...(clientId && !user.clientId && { clientId }),
      ...(status && { status }),
      ...(q && { name: { contains: q } }),
    };

    const orderBy: Prisma.ProjectOrderByWithRelationInput = sort
      ? { [sort.replace(/^-/, "")]: sort.startsWith("-") ? "desc" : "asc" }
      : { createdAt: "desc" };

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          client: { select: { id: true, name: true } },
          _count: { select: { tasks: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return ok(items, pageMeta(page, pageSize, total));
  } catch (err) {
    return internalError(err);
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = await requirePermission("project:create");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(new z.ZodError([]));
  }
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const client = await prisma.client.findFirst({
      where: { id: parsed.data.clientId, deletedAt: null },
    });
    if (!client) return notFound("Client");

    const project = await prisma.project.create({
      data: parsed.data,
      include: { client: { select: { id: true, name: true } } },
    });
    await logActivity({
      actorId: user.id,
      entityType: "project",
      entityId: project.id,
      action: "created",
      meta: { name: project.name, client: client.name },
    });
    return created(project);
  } catch (err) {
    return internalError(err);
  }
}

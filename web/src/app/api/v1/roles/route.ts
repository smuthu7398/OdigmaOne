import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import {
  created,
  fail,
  internalError,
  ok,
  validationError,
} from "@/lib/api";
import { z } from "zod";

const createRoleSchema = z.object({
  name: z.string().min(1, "Role name is required").max(50),
  description: z.string().max(200).optional(),
  permissions: z.array(z.string()).default([]),
});

export async function GET() {
  const { error } = await requirePermission("role:read");
  if (error) return error;

  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });
    return ok(
      roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        userCount: r._count.users,
        permissions: r.permissions.map((p) => p.permission.key),
      }))
    );
  } catch (err) {
    return internalError(err);
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = await requirePermission("role:create");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(new z.ZodError([]));
  }
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  try {
    const existing = await prisma.role.findUnique({
      where: { name: data.name },
    });
    if (existing) return fail(409, "CONFLICT", "Role name already exists");

    const perms = await prisma.permission.findMany({
      where: { key: { in: data.permissions } },
    });

    const role = await prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        isSystem: false,
        permissions: {
          create: perms.map((p) => ({ permissionId: p.id })),
        },
      },
    });

    await logActivity({
      actorId: user.id,
      entityType: "role",
      entityId: role.id,
      action: "created",
      meta: { name: role.name },
    });
    return created({ id: role.id, name: role.name });
  } catch (err) {
    return internalError(err);
  }
}

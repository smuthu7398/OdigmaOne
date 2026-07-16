import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import {
  fail,
  internalError,
  notFound,
  ok,
  validationError,
} from "@/lib/api";
import { z } from "zod";

const updateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).nullable().optional(),
  permissions: z.array(z.string()).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("role:update");
  if (error) return error;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(new z.ZodError([]));
  }
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  try {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) return notFound("Role");

    if (role.name === "Super Admin") {
      return fail(400, "CONFLICT", "The Super Admin role can't be modified");
    }
    if (role.isSystem && data.name && data.name !== role.name) {
      return fail(400, "CONFLICT", "System roles can't be renamed");
    }

    if (data.permissions) {
      const perms = await prisma.permission.findMany({
        where: { key: { in: data.permissions } },
      });
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });
      await prisma.rolePermission.createMany({
        data: perms.map((p) => ({ roleId: id, permissionId: p.id })),
      });
    }

    const updated = await prisma.role.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
      },
    });

    await logActivity({
      actorId: user.id,
      entityType: "role",
      entityId: id,
      action: "updated",
      meta: { name: updated.name, fields: Object.keys(data) },
    });
    return ok({ id: updated.id, name: updated.name });
  } catch (err) {
    return internalError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("role:delete");
  if (error) return error;
  const { id } = await params;

  try {
    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) return notFound("Role");
    if (role.isSystem) {
      return fail(400, "CONFLICT", "System roles can't be deleted");
    }
    if (role._count.users > 0) {
      return fail(
        400,
        "CONFLICT",
        `${role._count.users} user(s) still have this role — reassign them first`
      );
    }

    await prisma.role.delete({ where: { id } });
    await logActivity({
      actorId: user.id,
      entityType: "role",
      entityId: id,
      action: "deleted",
      meta: { name: role.name },
    });
    return ok({ id });
  } catch (err) {
    return internalError(err);
  }
}

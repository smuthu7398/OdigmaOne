import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import {
  fail,
  forbidden,
  internalError,
  notFound,
  ok,
  validationError,
} from "@/lib/api";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  roleId: z.string().optional(),
  clientId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("user:update");
  if (error) return error;
  if (user.clientId) return forbidden();
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(new z.ZodError([]));
  }
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  try {
    const target = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!target) return notFound("User");

    // guard rails: you can't deactivate or demote yourself,
    // and the last active Super Admin is untouchable
    if (id === user.id && (data.isActive === false || data.roleId)) {
      return fail(400, "CONFLICT", "You can't change your own role or deactivate yourself");
    }
    if (target.role?.name === "Super Admin") {
      const superAdmins = await prisma.user.count({
        where: { isActive: true, role: { name: "Super Admin" } },
      });
      if (superAdmins <= 1 && (data.isActive === false || data.roleId)) {
        return fail(400, "CONFLICT", "At least one active Super Admin is required");
      }
    }
    if (data.roleId) {
      const role = await prisma.role.findUnique({ where: { id: data.roleId } });
      if (!role) return fail(400, "VALIDATION_ERROR", "Unknown role");
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        role: { select: { id: true, name: true } },
      },
    });

    await logActivity({
      actorId: user.id,
      entityType: "user",
      entityId: id,
      action: "updated",
      meta: { name: target.name, fields: Object.keys(data) },
    });
    return ok(updated);
  } catch (err) {
    return internalError(err);
  }
}

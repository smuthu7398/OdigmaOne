import { NextRequest } from "next/server";
import { updateProjectSchema } from "@odigma/shared";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import {
  forbidden,
  internalError,
  notFound,
  ok,
  validationError,
} from "@/lib/api";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("project:read");
  if (error) return error;
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    include: {
      client: { select: { id: true, name: true } },
      _count: { select: { tasks: true } },
    },
  });
  if (!project) return notFound("Project");
  if (user.clientId && project.clientId !== user.clientId) return forbidden();
  return ok(project);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("project:update");
  if (error) return error;
  const { id } = await params;
  if (user.clientId) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(new z.ZodError([]));
  }
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const existing = await prisma.project.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) return notFound("Project");

    const project = await prisma.project.update({
      where: { id },
      data: parsed.data,
      include: { client: { select: { id: true, name: true } } },
    });
    await logActivity({
      actorId: user.id,
      entityType: "project",
      entityId: id,
      action: "updated",
      meta: { fields: Object.keys(parsed.data) },
    });
    return ok(project);
  } catch (err) {
    return internalError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("project:delete");
  if (error) return error;
  const { id } = await params;
  if (user.clientId) return forbidden();

  try {
    const existing = await prisma.project.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) return notFound("Project");

    await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await logActivity({
      actorId: user.id,
      entityType: "project",
      entityId: id,
      action: "deleted",
      meta: { name: existing.name },
    });
    return ok({ id });
  } catch (err) {
    return internalError(err);
  }
}

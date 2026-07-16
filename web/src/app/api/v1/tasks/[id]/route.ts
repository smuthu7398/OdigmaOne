import { NextRequest } from "next/server";
import { updateTaskSchema } from "@odigma/shared";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import {
  forbidden,
  internalError,
  notFound,
  ok,
  validationError,
} from "@/lib/api";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";

const TASK_INCLUDE = {
  client: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true, image: true } },
  assignedBy: { select: { id: true, name: true } },
  _count: { select: { comments: true, attachments: true } },
} satisfies Prisma.TaskInclude;

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("task:read");
  if (error) return error;
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null },
    include: TASK_INCLUDE,
  });
  if (!task) return notFound("Task");
  if (user.clientId && task.clientId !== user.clientId) return forbidden();
  return ok(task);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("task:update");
  if (error) return error;
  const { id } = await params;
  if (user.clientId) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(new z.ZodError([]));
  }
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  try {
    const existing = await prisma.task.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) return notFound("Task");

    // reassignment needs the assign permission
    if (
      data.assignedToId !== undefined &&
      data.assignedToId !== existing.assignedToId &&
      !user.permissions.has("task:assign")
    ) {
      return forbidden();
    }

    if (data.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: data.projectId,
          clientId: data.clientId ?? existing.clientId,
          deletedAt: null,
        },
      });
      if (!project) return notFound("Project (for this client)");
    }

    // finishing a task implies 100% progress
    if (data.status === "DONE" && data.progress === undefined) {
      data.progress = 100;
    }

    const task = await prisma.task.update({
      where: { id },
      data,
      include: TASK_INCLUDE,
    });

    await logActivity({
      actorId: user.id,
      entityType: "task",
      entityId: id,
      action:
        data.status && data.status !== existing.status
          ? "status_changed"
          : "updated",
      meta:
        data.status && data.status !== existing.status
          ? { number: existing.number, from: existing.status, to: data.status }
          : { number: existing.number, fields: Object.keys(data) },
    });

    if (data.assignedToId && data.assignedToId !== existing.assignedToId) {
      await notify({
        userIds: [data.assignedToId],
        actorId: user.id,
        type: "task_assigned",
        title: `${user.name} assigned you ODG-${existing.number}`,
        body: existing.title,
        link: `/tasks/${id}`,
      });
    }
    if (data.status && data.status !== existing.status) {
      await notify({
        userIds: [existing.assignedToId, existing.assignedById],
        actorId: user.id,
        type: "task_status",
        title: `ODG-${existing.number} is now ${data.status.replace("_", " ").toLowerCase()}`,
        body: existing.title,
        link: `/tasks/${id}`,
      });
    }
    return ok(task);
  } catch (err) {
    return internalError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("task:delete");
  if (error) return error;
  const { id } = await params;
  if (user.clientId) return forbidden();

  try {
    const existing = await prisma.task.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) return notFound("Task");

    await prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await logActivity({
      actorId: user.id,
      entityType: "task",
      entityId: id,
      action: "deleted",
      meta: { number: existing.number, title: existing.title },
    });
    return ok({ id });
  } catch (err) {
    return internalError(err);
  }
}

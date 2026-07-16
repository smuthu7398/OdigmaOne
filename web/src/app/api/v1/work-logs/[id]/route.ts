import { NextRequest } from "next/server";
import { updateWorkLogSchema } from "@odigma/shared";
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

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("worklog:update");
  if (error) return error;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(new z.ZodError([]));
  }
  const parsed = updateWorkLogSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  try {
    const existing = await prisma.workLog.findUnique({ where: { id } });
    if (!existing) return notFound("Work log");
    if (existing.userId !== user.id) return forbidden(); // only your own

    const workLog = await prisma.workLog.update({
      where: { id },
      data: {
        ...(data.description && { description: data.description }),
        ...(data.hours && { hours: data.hours }),
        ...(data.workDate && {
          workDate: new Date(`${data.workDate}T00:00:00Z`),
        }),
        ...(data.taskId !== undefined && { taskId: data.taskId || null }),
      },
    });
    return ok(workLog);
  } catch (err) {
    return internalError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("worklog:create");
  if (error) return error;
  const { id } = await params;

  try {
    const existing = await prisma.workLog.findUnique({ where: { id } });
    if (!existing) return notFound("Work log");
    if (
      existing.userId !== user.id &&
      !user.permissions.has("worklog:delete")
    ) {
      return forbidden();
    }

    await prisma.workLog.delete({ where: { id } });
    await logActivity({
      actorId: user.id,
      entityType: "worklog",
      entityId: id,
      action: "deleted",
    });
    return ok({ id });
  } catch (err) {
    return internalError(err);
  }
}

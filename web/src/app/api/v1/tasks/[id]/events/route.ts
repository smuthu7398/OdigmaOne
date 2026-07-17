import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { forbidden, internalError, notFound, ok } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/** System events for one task's discussion timeline (created, status
 *  changes, reopens). Scoped like the task itself, so portal users see
 *  the history of their own tasks without the global activity permission. */
export async function GET(_request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("task:read");
  if (error) return error;
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null },
  });
  if (!task) return notFound("Task");
  if (user.clientId && task.clientId !== user.clientId) return forbidden();

  try {
    const events = await prisma.activity.findMany({
      where: {
        entityType: "task",
        entityId: id,
        action: { in: ["created", "status_changed", "reopened"] },
      },
      orderBy: { createdAt: "asc" },
      include: { actor: { select: { id: true, name: true } } },
    });
    return ok(events);
  } catch (err) {
    return internalError(err);
  }
}

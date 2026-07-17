import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { sanitizeRichText } from "@/lib/sanitize";
import { linkEmbeddedFiles } from "@/lib/link-files";
import {
  created,
  forbidden,
  internalError,
  notFound,
  ok,
  validationError,
} from "@/lib/api";
import { z } from "zod";

const createCommentSchema = z.object({
  body: z.string().min(1, "Comment can't be empty").max(50000),
});

type Params = { params: Promise<{ id: string }> };

async function findScopedTask(id: string, clientId: string | null) {
  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null },
    include: { assignees: { select: { userId: true } } },
  });
  if (!task) return { task: null, scoped: false };
  if (clientId && task.clientId !== clientId) return { task, scoped: false };
  return { task, scoped: true };
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("comment:read");
  if (error) return error;
  const { id } = await params;

  const { task, scoped } = await findScopedTask(id, user.clientId);
  if (!task) return notFound("Task");
  if (!scoped) return forbidden();

  const comments = await prisma.comment.findMany({
    where: { taskId: id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, image: true } } },
  });
  return ok(comments);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("comment:create");
  if (error) return error;
  const { id } = await params;

  const { task, scoped } = await findScopedTask(id, user.clientId);
  if (!task) return notFound("Task");
  if (!scoped) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(new z.ZodError([]));
  }
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const comment = await prisma.comment.create({
      data: {
        taskId: id,
        authorId: user.id,
        body: sanitizeRichText(parsed.data.body),
      },
      include: { author: { select: { id: true, name: true, image: true } } },
    });
    await linkEmbeddedFiles(comment.body, {
      taskId: id,
      clientId: task.clientId,
    });
    await logActivity({
      actorId: user.id,
      entityType: "comment",
      entityId: comment.id,
      action: "created",
      meta: { taskNumber: task.number },
    });
    await notify({
      userIds: [...task.assignees.map((a) => a.userId), task.assignedById],
      actorId: user.id,
      type: "comment_added",
      title: `${user.name} commented on ODG-${task.number}`,
      body: parsed.data.body.replace(/<[^>]+>/g, " ").trim().slice(0, 120),
      link: `/tasks/${task.id}`,
    });
    return created(comment);
  } catch (err) {
    return internalError(err);
  }
}

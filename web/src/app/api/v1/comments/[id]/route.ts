import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { sanitizeRichText } from "@/lib/sanitize";
import {
  forbidden,
  internalError,
  notFound,
  ok,
  validationError,
} from "@/lib/api";
import { z } from "zod";

const updateCommentSchema = z.object({
  body: z.string().min(1, "Comment can't be empty").max(50000),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("comment:read");
  if (error) return error;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(new z.ZodError([]));
  }
  const parsed = updateCommentSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const existing = await prisma.comment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) return notFound("Comment");

    // authors edit their own; comment:update lets moderators edit any
    if (existing.authorId !== user.id && !user.permissions.has("comment:update")) {
      return forbidden();
    }

    const comment = await prisma.comment.update({
      where: { id },
      data: { body: sanitizeRichText(parsed.data.body) },
      include: { author: { select: { id: true, name: true, image: true } } },
    });
    return ok(comment);
  } catch (err) {
    return internalError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("comment:read");
  if (error) return error;
  const { id } = await params;

  try {
    const existing = await prisma.comment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) return notFound("Comment");

    if (existing.authorId !== user.id && !user.permissions.has("comment:delete")) {
      return forbidden();
    }

    await prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await logActivity({
      actorId: user.id,
      entityType: "comment",
      entityId: id,
      action: "deleted",
    });
    return ok({ id });
  } catch (err) {
    return internalError(err);
  }
}

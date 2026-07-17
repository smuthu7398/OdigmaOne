import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { sanitizeRichText } from "@/lib/sanitize";
import { linkEmbeddedFiles } from "@/lib/link-files";
import {
  forbidden,
  internalError,
  notFound,
  ok,
  validationError,
} from "@/lib/api";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";

const updateDocSchema = z.object({
  title: z.string().min(1).max(191).optional(),
  content: z.string().max(500000).nullable().optional(),
  clientId: z.string().nullable().optional(),
});

const DOC_INCLUDE = {
  client: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.DocumentInclude;

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("doc:read");
  if (error) return error;
  const { id } = await params;

  const doc = await prisma.document.findFirst({
    where: { id, deletedAt: null },
    include: DOC_INCLUDE,
  });
  if (!doc) return notFound("Document");
  if (user.clientId && doc.clientId !== user.clientId) return forbidden();
  return ok(doc);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("doc:update");
  if (error) return error;
  const { id } = await params;
  if (user.clientId) return forbidden(); // docs are authored by the team

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(new z.ZodError([]));
  }
  const parsed = updateDocSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  try {
    const existing = await prisma.document.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) return notFound("Document");

    const doc = await prisma.document.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && {
          content: data.content ? sanitizeRichText(data.content) : null,
        }),
        ...(data.clientId !== undefined && { clientId: data.clientId }),
      },
      include: DOC_INCLUDE,
    });
    await linkEmbeddedFiles(doc.content, { clientId: doc.clientId });
    await logActivity({
      actorId: user.id,
      entityType: "doc",
      entityId: id,
      action: "updated",
      meta: { title: doc.title },
    });
    return ok(doc);
  } catch (err) {
    return internalError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("doc:delete");
  if (error) return error;
  const { id } = await params;
  if (user.clientId) return forbidden();

  try {
    const existing = await prisma.document.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) return notFound("Document");

    await prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await logActivity({
      actorId: user.id,
      entityType: "doc",
      entityId: id,
      action: "deleted",
      meta: { title: existing.title },
    });
    return ok({ id });
  } catch (err) {
    return internalError(err);
  }
}

import { NextRequest } from "next/server";
import { paginationQuerySchema } from "@odigma/shared";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { sanitizeRichText } from "@/lib/sanitize";
import { linkEmbeddedFiles } from "@/lib/link-files";
import {
  created,
  internalError,
  notFound,
  ok,
  pageMeta,
  validationError,
} from "@/lib/api";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";

const createDocSchema = z.object({
  title: z.string().min(1, "Title is required").max(191),
  content: z.string().max(500000).optional(),
  clientId: z.string().nullable().optional(),
});

const DOC_INCLUDE = {
  client: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.DocumentInclude;

const listQuerySchema = paginationQuerySchema.extend({
  clientId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { user, error } = await requirePermission("doc:read");
  if (error) return error;

  const parsed = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) return validationError(parsed.error);
  const { page, pageSize, q, clientId } = parsed.data;

  try {
    const where: Prisma.DocumentWhereInput = {
      deletedAt: null,
      // portal users see only docs written for their client
      ...(user.clientId
        ? { clientId: user.clientId }
        : clientId
          ? { clientId: clientId === "internal" ? null : clientId }
          : {}),
      ...(q && { title: { contains: q } }),
    };

    const [items, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: DOC_INCLUDE,
        omit: { content: true }, // list stays light
      }),
      prisma.document.count({ where }),
    ]);
    return ok(items, pageMeta(page, pageSize, total));
  } catch (err) {
    return internalError(err);
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = await requirePermission("doc:create");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(new z.ZodError([]));
  }
  const parsed = createDocSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  // portal authors (if ever granted doc:create) write for their own client
  if (user.clientId) data.clientId = user.clientId;

  try {
    if (data.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: data.clientId, deletedAt: null },
      });
      if (!client) return notFound("Client");
    }

    const doc = await prisma.document.create({
      data: {
        title: data.title,
        content: data.content ? sanitizeRichText(data.content) : null,
        clientId: data.clientId ?? null,
        createdById: user.id,
      },
      include: DOC_INCLUDE,
    });
    await linkEmbeddedFiles(doc.content, { clientId: doc.clientId });
    await logActivity({
      actorId: user.id,
      entityType: "doc",
      entityId: doc.id,
      action: "created",
      meta: { title: doc.title },
    });
    return created(doc);
  } catch (err) {
    return internalError(err);
  }
}

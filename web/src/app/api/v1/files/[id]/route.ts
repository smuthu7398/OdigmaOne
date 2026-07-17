import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { deleteStoredFile, readStoredFile } from "@/lib/storage";
import { forbidden, internalError, notFound, ok } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

const INLINE_TYPES = /^(image\/|application\/pdf|text\/plain)/;

export async function GET(request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("file:read");
  if (error) return error;
  const { id } = await params;

  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) return notFound("File");
  if (user.clientId && attachment.clientId !== user.clientId) {
    return forbidden();
  }

  try {
    const buffer = await readStoredFile(attachment.path);
    // ?download=1 forces a save dialog instead of inline preview
    const forceDownload =
      request.nextUrl.searchParams.get("download") === "1";
    const disposition =
      !forceDownload && INLINE_TYPES.test(attachment.mimeType)
        ? "inline"
        : "attachment";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(attachment.size),
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(attachment.originalName)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return internalError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  // deletion is admin-only (file:delete) — uploaders can NOT remove
  // their own files; files are part of the audit trail
  const { user, error } = await requirePermission("file:delete");
  if (error) return error;
  const { id } = await params;

  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) return notFound("File");

  try {
    await prisma.attachment.delete({ where: { id } });
    await deleteStoredFile(attachment.path);
    await logActivity({
      actorId: user.id,
      entityType: "file",
      entityId: id,
      action: "deleted",
      meta: { name: attachment.originalName },
    });
    return ok({ id });
  } catch (err) {
    return internalError(err);
  }
}

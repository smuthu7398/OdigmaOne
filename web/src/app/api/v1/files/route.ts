import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { saveFile } from "@/lib/storage";
import {
  created,
  fail,
  forbidden,
  internalError,
  notFound,
  ok,
} from "@/lib/api";

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

const ATTACHMENT_INCLUDE = {
  uploader: { select: { id: true, name: true } },
} as const;

export async function GET(request: NextRequest) {
  const { user, error } = await requirePermission("file:read");
  if (error) return error;

  const taskId = request.nextUrl.searchParams.get("taskId");
  if (!taskId) return fail(400, "VALIDATION_ERROR", "taskId is required");

  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
  });
  if (!task) return notFound("Task");
  if (user.clientId && task.clientId !== user.clientId) return forbidden();

  const files = await prisma.attachment.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
    include: ATTACHMENT_INCLUDE,
  });
  return ok(files);
}

export async function POST(request: NextRequest) {
  const { user, error } = await requirePermission("file:upload");
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const taskId = formData.get("taskId");

    if (!(file instanceof File)) {
      return fail(400, "VALIDATION_ERROR", "Attach a file in the 'file' field");
    }
    if (file.size === 0) {
      return fail(400, "VALIDATION_ERROR", "File is empty");
    }
    if (file.size > MAX_SIZE) {
      return fail(
        400,
        "VALIDATION_ERROR",
        "File exceeds 25 MB — compress and retry"
      );
    }

    let clientId: string | null = null;
    if (typeof taskId === "string" && taskId) {
      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
      });
      if (!task) return notFound("Task");
      if (user.clientId && task.clientId !== user.clientId) return forbidden();
      clientId = task.clientId;
    } else if (user.clientId) {
      return forbidden(); // portal uploads must target a task
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await saveFile(buffer, file.name);

    const attachment = await prisma.attachment.create({
      data: {
        fileName: stored.fileName,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        path: stored.relativePath,
        uploaderId: user.id,
        taskId: typeof taskId === "string" && taskId ? taskId : null,
        clientId,
      },
      include: ATTACHMENT_INCLUDE,
    });

    await logActivity({
      actorId: user.id,
      entityType: "file",
      entityId: attachment.id,
      action: "uploaded",
      meta: { name: file.name, size: file.size },
    });
    return created(attachment);
  } catch (err) {
    return internalError(err);
  }
}

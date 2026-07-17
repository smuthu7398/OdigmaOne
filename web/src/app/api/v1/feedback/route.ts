import { NextRequest } from "next/server";
import { paginationQuerySchema } from "@odigma/shared";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { notify } from "@/lib/notify";
import { sanitizeRichText } from "@/lib/sanitize";
import {
  created,
  fail,
  internalError,
  ok,
  pageMeta,
  validationError,
} from "@/lib/api";
import { z } from "zod";

const createFeedbackSchema = z.object({
  message: z.string().min(1, "Tell us something").max(20000),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  taskId: z.string().optional(),
  clientId: z.string().optional(), // team submitting on a client's behalf
});

export async function GET(request: NextRequest) {
  const { user, error } = await requirePermission("feedback:read");
  if (error) return error;

  const parsed = paginationQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) return validationError(parsed.error);
  const { page, pageSize } = parsed.data;

  try {
    const where = user.clientId ? { clientId: user.clientId } : {};
    const [items, total] = await Promise.all([
      prisma.clientFeedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          client: { select: { id: true, name: true } },
          task: { select: { id: true, number: true, title: true } },
        },
      }),
      prisma.clientFeedback.count({ where }),
    ]);
    return ok(items, pageMeta(page, pageSize, total));
  } catch (err) {
    return internalError(err);
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = await requirePermission("feedback:create");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(new z.ZodError([]));
  }
  const parsed = createFeedbackSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  // portal users always submit for their own client
  const clientId = user.clientId ?? data.clientId;
  if (!clientId) {
    return fail(400, "VALIDATION_ERROR", "clientId is required");
  }

  try {
    const feedback = await prisma.clientFeedback.create({
      data: {
        clientId,
        taskId: data.taskId ?? null,
        rating: data.rating ?? null,
        message: sanitizeRichText(data.message),
      },
      include: { client: { select: { id: true, name: true } } },
    });

    // let admins/managers know
    const managers = await prisma.user.findMany({
      where: {
        isActive: true,
        clientId: null,
        role: { name: { in: ["Super Admin", "Admin", "Manager"] } },
      },
      select: { id: true },
    });
    await notify({
      userIds: managers.map((m) => m.id),
      actorId: user.id,
      type: "feedback_received",
      title: `New feedback from ${feedback.client.name}`,
      body: data.message.replace(/<[^>]+>/g, " ").trim().slice(0, 120),
      link: "/feedback",
    });

    return created(feedback);
  } catch (err) {
    return internalError(err);
  }
}

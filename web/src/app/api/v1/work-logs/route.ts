import { NextRequest } from "next/server";
import { createWorkLogSchema, paginationQuerySchema } from "@odigma/shared";
import { prisma } from "@/lib/prisma";
import { requirePermission, can } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import {
  created,
  forbidden,
  internalError,
  notFound,
  ok,
  pageMeta,
  validationError,
} from "@/lib/api";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";

const WORKLOG_INCLUDE = {
  user: { select: { id: true, name: true } },
  task: { select: { id: true, number: true, title: true } },
  client: { select: { id: true, name: true } },
} satisfies Prisma.WorkLogInclude;

const listQuerySchema = paginationQuerySchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  userId: z.string().optional(),
  clientId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { user, error } = await requirePermission("worklog:read");
  if (error) return error;

  const parsed = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) return validationError(parsed.error);
  const { page, pageSize, date, from, to, userId, clientId } = parsed.data;

  // seeing other people's logs needs user:read (managers/leads)
  const canSeeOthers = can(user, "user:read");
  const effectiveUserId = canSeeOthers ? userId : user.id;

  try {
    const where: Prisma.WorkLogWhereInput = {
      ...(effectiveUserId && { userId: effectiveUserId }),
      ...(clientId && { clientId }),
      ...(date && { workDate: new Date(`${date}T00:00:00Z`) }),
      ...((from || to) && {
        workDate: {
          ...(from && { gte: new Date(`${from}T00:00:00Z`) }),
          ...(to && { lte: new Date(`${to}T00:00:00Z`) }),
        },
      }),
    };

    const [items, total, sum] = await Promise.all([
      prisma.workLog.findMany({
        where,
        orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: WORKLOG_INCLUDE,
      }),
      prisma.workLog.count({ where }),
      prisma.workLog.aggregate({ _sum: { hours: true }, where }),
    ]);

    return ok(
      { items, totalHours: Number(sum._sum.hours ?? 0) },
      pageMeta(page, pageSize, total)
    );
  } catch (err) {
    return internalError(err);
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = await requirePermission("worklog:create");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(new z.ZodError([]));
  }
  const parsed = createWorkLogSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  try {
    let clientId = data.clientId ?? null;
    if (data.taskId) {
      const task = await prisma.task.findFirst({
        where: { id: data.taskId, deletedAt: null },
      });
      if (!task) return notFound("Task");
      clientId = task.clientId; // task wins — keeps hours attributed correctly
    }

    const workLog = await prisma.workLog.create({
      data: {
        userId: user.id,
        taskId: data.taskId ?? null,
        clientId,
        workDate: new Date(`${data.workDate}T00:00:00Z`),
        description: data.description,
        hours: data.hours,
      },
      include: WORKLOG_INCLUDE,
    });

    await logActivity({
      actorId: user.id,
      entityType: "worklog",
      entityId: workLog.id,
      action: "created",
      meta: { date: data.workDate, hours: data.hours },
    });
    return created(workLog);
  } catch (err) {
    return internalError(err);
  }
}

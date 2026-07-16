import { NextRequest } from "next/server";
import { createTaskSchema, paginationQuerySchema } from "@odigma/shared";
import { prisma } from "@/lib/prisma";
import { clientScope, requirePermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
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

const TASK_INCLUDE = {
  client: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true, image: true } },
  assignedBy: { select: { id: true, name: true } },
  _count: { select: { comments: true, attachments: true } },
} satisfies Prisma.TaskInclude;

const listQuerySchema = paginationQuerySchema.extend({
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  assignedToId: z.string().optional(),
  status: z
    .enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  type: z.enum(["TASK", "BUG"]).optional(),
  due: z.enum(["today", "overdue"]).optional(),
});

export async function GET(request: NextRequest) {
  const { user, error } = await requirePermission("task:read");
  if (error) return error;

  const parsed = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) return validationError(parsed.error);
  const {
    page,
    pageSize,
    q,
    sort,
    clientId,
    projectId,
    assignedToId,
    status,
    priority,
    type,
    due,
  } = parsed.data;

  try {
    // "today" in IST
    const istDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(new Date());
    const dayStart = new Date(`${istDate}T00:00:00+05:30`);
    const dayEnd = new Date(`${istDate}T23:59:59.999+05:30`);

    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      ...clientScope(user),
      ...(clientId && !user.clientId && { clientId }),
      ...(projectId && { projectId }),
      ...(assignedToId && { assignedToId }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(type && { type }),
      ...(due === "today" && {
        dueDate: { gte: dayStart, lte: dayEnd },
        status: { not: "DONE" as const },
      }),
      ...(due === "overdue" && {
        dueDate: { lt: dayStart },
        status: { not: "DONE" as const },
      }),
      ...(q && {
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          ...(/^\d+$/.test(q) ? [{ number: Number(q) }] : []),
        ],
      }),
    };

    const orderBy: Prisma.TaskOrderByWithRelationInput = sort
      ? { [sort.replace(/^-/, "")]: sort.startsWith("-") ? "desc" : "asc" }
      : { createdAt: "desc" };

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: TASK_INCLUDE,
      }),
      prisma.task.count({ where }),
    ]);

    return ok(items, pageMeta(page, pageSize, total));
  } catch (err) {
    return internalError(err);
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = await requirePermission("task:create");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(new z.ZodError([]));
  }
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  try {
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, deletedAt: null },
    });
    if (!client) return notFound("Client");

    if (data.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: data.projectId, clientId: data.clientId, deletedAt: null },
      });
      if (!project) return notFound("Project (for this client)");
    }

    const task = await prisma.task.create({
      data: { ...data, assignedById: user.id },
      include: TASK_INCLUDE,
    });
    await logActivity({
      actorId: user.id,
      entityType: "task",
      entityId: task.id,
      action: "created",
      meta: { number: task.number, title: task.title },
    });
    await notify({
      userIds: [task.assignedToId],
      actorId: user.id,
      type: "task_assigned",
      title: `${user.name} assigned you ODG-${task.number}`,
      body: task.title,
      link: `/tasks/${task.id}`,
    });
    return created(task);
  } catch (err) {
    return internalError(err);
  }
}

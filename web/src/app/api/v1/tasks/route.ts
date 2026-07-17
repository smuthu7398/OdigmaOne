import { NextRequest } from "next/server";
import { createTaskSchema, paginationQuerySchema } from "@odigma/shared";
import { prisma } from "@/lib/prisma";
import { clientScope, requirePermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { sanitizeRichText } from "@/lib/sanitize";
import {
  created,
  fail,
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
  assignees: {
    include: { user: { select: { id: true, name: true, image: true } } },
  },
  assignedBy: { select: { id: true, name: true } },
  _count: { select: { comments: true, attachments: true } },
} satisfies Prisma.TaskInclude;

const listQuerySchema = paginationQuerySchema.extend({
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  assignedToId: z.string().optional(), // filters tasks having this assignee
  status: z
    .enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  type: z.enum(["TASK", "BUG"]).optional(),
  due: z.enum(["today", "overdue"]).optional(),
  dueFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
    dueFrom,
    dueTo,
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
      ...(assignedToId && { assignees: { some: { userId: assignedToId } } }),
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
      ...((dueFrom || dueTo) && {
        dueDate: {
          ...(dueFrom && { gte: new Date(`${dueFrom}T00:00:00+05:30`) }),
          ...(dueTo && { lte: new Date(`${dueTo}T23:59:59.999+05:30`) }),
        },
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
  const { assigneeIds, ...data } = parsed.data;

  if (data.description) data.description = sanitizeRichText(data.description);

  // portal users file requests for their own client only, always as To Do
  if (user.clientId) {
    data.clientId = user.clientId;
    data.status = "TODO";
  }

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

    // assignees must be active team members
    const validAssignees = await prisma.user.findMany({
      where: { id: { in: assigneeIds }, isActive: true, clientId: null },
      select: { id: true },
    });
    if (validAssignees.length !== new Set(assigneeIds).size) {
      return fail(400, "VALIDATION_ERROR", "Unknown assignee selected");
    }

    const task = await prisma.task.create({
      data: {
        ...data,
        assignedById: user.id,
        assignees: {
          create: [...new Set(assigneeIds)].map((userId) => ({ userId })),
        },
      },
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
      userIds: assigneeIds,
      actorId: user.id,
      type: "task_assigned",
      title: user.clientId
        ? `New request from ${client.name}: ODG-${task.number}`
        : `${user.name} assigned you ODG-${task.number}`,
      body: task.title,
      link: `/tasks/${task.id}`,
    });
    // the account manager always hears about new client requests
    if (
      user.clientId &&
      client.accountManagerId &&
      !assigneeIds.includes(client.accountManagerId)
    ) {
      await notify({
        userIds: [client.accountManagerId],
        actorId: user.id,
        type: "task_assigned",
        title: `New request from ${client.name}: ODG-${task.number}`,
        body: task.title,
        link: `/tasks/${task.id}`,
      });
    }
    return created(task);
  } catch (err) {
    return internalError(err);
  }
}

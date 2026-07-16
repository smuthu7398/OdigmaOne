import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientScope, requirePermission } from "@/lib/rbac";
import { internalError, ok, validationError } from "@/lib/api";
import { z } from "zod";

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: NextRequest) {
  const { user, error } = await requirePermission("report:read");
  if (error) return error;

  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) return validationError(parsed.error);
  const from = new Date(`${parsed.data.from}T00:00:00Z`);
  const to = new Date(`${parsed.data.to}T00:00:00Z`);
  const scope = clientScope(user);

  try {
    const [tasksByStatus, tasksByClientRaw, logs] = await Promise.all([
      prisma.task.groupBy({
        by: ["status"],
        where: { deletedAt: null, ...scope },
        _count: true,
      }),
      prisma.task.groupBy({
        by: ["clientId"],
        where: { deletedAt: null, ...scope },
        _count: true,
      }),
      prisma.workLog.findMany({
        where: {
          workDate: { gte: from, lte: to },
          ...(user.clientId ? { clientId: user.clientId } : {}),
        },
        include: { user: { select: { id: true, name: true } } },
      }),
    ]);

    const clients = await prisma.client.findMany({
      where: { id: { in: tasksByClientRaw.map((t) => t.clientId) } },
      select: { id: true, name: true },
    });
    const clientName = new Map(clients.map((c) => [c.id, c.name]));

    // timesheet: user × day matrix
    const byUser = new Map<
      string,
      { name: string; total: number; days: Record<string, number> }
    >();
    for (const log of logs) {
      const day = log.workDate.toISOString().slice(0, 10);
      const hours = Number(log.hours);
      const entry = byUser.get(log.userId) ?? {
        name: log.user.name,
        total: 0,
        days: {},
      };
      entry.total += hours;
      entry.days[day] = (entry.days[day] ?? 0) + hours;
      byUser.set(log.userId, entry);
    }

    return ok({
      tasksByStatus: tasksByStatus.map((t) => ({
        status: t.status,
        count: t._count,
      })),
      tasksByClient: tasksByClientRaw
        .map((t) => ({
          client: clientName.get(t.clientId) ?? "Unknown",
          count: t._count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      timesheet: [...byUser.entries()]
        .map(([userId, e]) => ({ userId, ...e }))
        .sort((a, b) => b.total - a.total),
    });
  } catch (err) {
    return internalError(err);
  }
}

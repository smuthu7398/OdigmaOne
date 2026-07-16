import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { can, clientScope, requirePermission } from "@/lib/rbac";
import { internalError, ok } from "@/lib/api";

/** Global search across tasks, clients and projects — each section only
 *  included if the user may read it; portal users stay row-scoped. */
export async function GET(request: NextRequest) {
  const { user, error } = await requirePermission();
  if (error) return error;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return ok({ tasks: [], clients: [], projects: [] });
  }

  try {
    const scope = clientScope(user);
    const taskNumber = /^(?:odg-?)?(\d+)$/i.exec(q)?.[1];

    const [tasks, clients, projects] = await Promise.all([
      can(user, "task:read")
        ? prisma.task.findMany({
            where: {
              deletedAt: null,
              ...scope,
              OR: [
                { title: { contains: q } },
                ...(taskNumber ? [{ number: Number(taskNumber) }] : []),
              ],
            },
            take: 6,
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              number: true,
              title: true,
              status: true,
              type: true,
              client: { select: { name: true } },
            },
          })
        : [],
      can(user, "client:read") && !user.clientId
        ? prisma.client.findMany({
            where: {
              deletedAt: null,
              OR: [{ name: { contains: q } }, { companyName: { contains: q } }],
            },
            take: 4,
            select: { id: true, name: true, companyName: true, status: true },
          })
        : [],
      can(user, "project:read")
        ? prisma.project.findMany({
            where: {
              deletedAt: null,
              ...scope,
              name: { contains: q },
            },
            take: 4,
            select: {
              id: true,
              name: true,
              status: true,
              client: { select: { name: true } },
            },
          })
        : [],
    ]);

    return ok({ tasks, clients, projects });
  } catch (err) {
    return internalError(err);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { forbidden, internalError, ok } from "@/lib/api";

/** Lightweight team list for assignee pickers. Portal users never see it. */
export async function GET(_request: NextRequest) {
  const { user, error } = await requirePermission();
  if (error) return error;
  if (user.clientId) return forbidden();

  try {
    const users = await prisma.user.findMany({
      where: { isActive: true, clientId: null },
      select: {
        id: true,
        name: true,
        image: true,
        role: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });
    return ok(users);
  } catch (err) {
    return internalError(err);
  }
}

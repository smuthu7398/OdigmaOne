import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { internalError, ok } from "@/lib/api";

export async function GET() {
  const { error } = await requirePermission("role:read");
  if (error) return error;

  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ group: "asc" }, { key: "asc" }],
    });
    return ok(permissions);
  } catch (err) {
    return internalError(err);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requirePermission, can } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import {
  created,
  fail,
  forbidden,
  internalError,
  ok,
  validationError,
} from "@/lib/api";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Minimum 8 characters"),
  roleId: z.string().min(1, "Role is required"),
  clientId: z.string().optional(), // set for client-portal accounts
});

/** Team list. Minimal shape for pickers; ?full=1 (needs user:read) for the
 *  management page. Portal users get names only — enough to direct a
 *  request at someone, nothing more. */
export async function GET(request: NextRequest) {
  const { user, error } = await requirePermission();
  if (error) return error;

  const full = request.nextUrl.searchParams.get("full") === "1";
  if (full && (user.clientId || !can(user, "user:read"))) return forbidden();

  try {
    if (!full) {
      const users = await prisma.user.findMany({
        where: { isActive: true, clientId: null },
        select: user.clientId
          ? { id: true, name: true } // portal: names only
          : {
              id: true,
              name: true,
              image: true,
              role: { select: { name: true } },
            },
        orderBy: { name: "asc" },
      });
      return ok(users);
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isActive: true,
        createdAt: true,
        roleId: true,
        role: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        _count: { select: { taskAssignments: true, workLogs: true } },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
    return ok(users);
  } catch (err) {
    return internalError(err);
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = await requirePermission("user:create");
  if (error) return error;
  if (user.clientId) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(new z.ZodError([]));
  }
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  try {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return fail(409, "CONFLICT", "A user with this email already exists");
    }
    const role = await prisma.role.findUnique({ where: { id: data.roleId } });
    if (!role) return fail(400, "VALIDATION_ERROR", "Unknown role");

    // Better Auth hashes the password; server-side call sets no cookies,
    // so the admin's own session is untouched.
    await auth.api.signUpEmail({
      body: { name: data.name, email: data.email, password: data.password },
    });

    const newUser = await prisma.user.update({
      where: { email: data.email },
      data: {
        roleId: data.roleId,
        clientId: data.clientId ?? null,
        emailVerified: true,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: { select: { id: true, name: true } },
      },
    });

    await logActivity({
      actorId: user.id,
      entityType: "user",
      entityId: newUser.id,
      action: "created",
      meta: { name: newUser.name, role: role.name },
    });
    return created(newUser);
  } catch (err) {
    return internalError(err);
  }
}

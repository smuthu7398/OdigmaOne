import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { forbidden, unauthorized } from "./api";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  roleId: string | null;
  roleName: string | null;
  clientId: string | null; // non-null = client-portal user, row-scope all queries
  timezone: string;
  permissions: Set<string>;
};

/** Resolve the current session into a user with permissions. Null if not signed in. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      role: {
        include: { permissions: { include: { permission: true } } },
      },
    },
  });
  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    roleId: user.roleId,
    roleName: user.role?.name ?? null,
    clientId: user.clientId,
    timezone: user.timezone,
    permissions: new Set(
      user.role?.permissions.map((rp) => rp.permission.key) ?? []
    ),
  };
}

export function can(user: SessionUser, permission: string): boolean {
  return user.permissions.has(permission);
}

type GuardResult =
  | { user: SessionUser; error?: never }
  | { user?: never; error: NextResponse };

/**
 * Route-handler guard:
 *   const { user, error } = await requirePermission("client:read");
 *   if (error) return error;
 */
export async function requirePermission(
  permission?: string
): Promise<GuardResult> {
  const user = await getSessionUser();
  if (!user) return { error: unauthorized() };
  if (permission && !can(user, permission)) return { error: forbidden() };
  return { user };
}

/** Client-portal users only ever see their own client's rows. */
export function clientScope(user: SessionUser): { clientId?: string } {
  return user.clientId ? { clientId: user.clientId } : {};
}

import { NextRequest } from "next/server";
import { updateClientSchema } from "@odigma/shared";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import {
  forbidden,
  internalError,
  notFound,
  ok,
  validationError,
} from "@/lib/api";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("client:read");
  if (error) return error;
  const { id } = await params;
  if (user.clientId && user.clientId !== id) return forbidden();

  const client = await prisma.client.findFirst({
    where: { id, deletedAt: null },
    include: { _count: { select: { projects: true, tasks: true } } },
  });
  if (!client) return notFound("Client");
  return ok(client);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("client:update");
  if (error) return error;
  const { id } = await params;
  if (user.clientId) return forbidden(); // portal users never edit clients

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(new z.ZodError([]));
  }
  const parsed = updateClientSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const existing = await prisma.client.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) return notFound("Client");

    const client = await prisma.client.update({
      where: { id },
      data: parsed.data,
    });
    await logActivity({
      actorId: user.id,
      entityType: "client",
      entityId: id,
      action: "updated",
      meta: { fields: Object.keys(parsed.data) },
    });
    return ok(client);
  } catch (err) {
    return internalError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, error } = await requirePermission("client:delete");
  if (error) return error;
  const { id } = await params;
  if (user.clientId) return forbidden();

  try {
    const existing = await prisma.client.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) return notFound("Client");

    await prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await logActivity({
      actorId: user.id,
      entityType: "client",
      entityId: id,
      action: "deleted",
      meta: { name: existing.name },
    });
    return ok({ id });
  } catch (err) {
    return internalError(err);
  }
}

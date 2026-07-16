import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { internalError, ok, validationError } from "@/lib/api";
import { z } from "zod";

const registerSchema = z.object({
  token: z
    .string()
    .regex(/^ExponentPushToken\[.+\]$/, "Not a valid Expo push token"),
  platform: z.enum(["ios", "android"]),
});

/** Register (or refresh) the calling user's device push token. */
export async function POST(request: NextRequest) {
  const { user, error } = await requirePermission();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(new z.ZodError([]));
  }
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    await prisma.pushToken.upsert({
      where: { token: parsed.data.token },
      // token may move between accounts on a shared device
      update: { userId: user.id, platform: parsed.data.platform },
      create: {
        userId: user.id,
        token: parsed.data.token,
        platform: parsed.data.platform,
      },
    });
    return ok({ registered: true });
  } catch (err) {
    return internalError(err);
  }
}

/** Unregister on sign-out. */
export async function DELETE(request: NextRequest) {
  const { user, error } = await requirePermission();
  if (error) return error;

  try {
    const body = (await request.json()) as { token?: string };
    if (body.token) {
      await prisma.pushToken.deleteMany({
        where: { token: body.token, userId: user.id },
      });
    }
    return ok({ removed: true });
  } catch (err) {
    return internalError(err);
  }
}

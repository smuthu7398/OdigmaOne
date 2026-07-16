import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { getSessionUser, can } from "@/lib/rbac";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

// Public self-signup is disabled: only admins with user:create may hit the
// sign-up endpoint (user creation itself goes through /api/v1/users).
export async function POST(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/auth/sign-up")) {
    const user = await getSessionUser();
    if (!user || !can(user, "user:create")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Sign-up is disabled. Ask an admin to create your account.",
          },
        },
        { status: 403 }
      );
    }
  }
  return handlers.POST(request);
}

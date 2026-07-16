import { prisma } from "./prisma";
import type { Prisma } from "@/generated/prisma";

/** Write an activity row. Never throws — logging must not break the action. */
export async function logActivity(input: {
  actorId?: string;
  entityType: "client" | "project" | "task" | "comment" | "user" | "role" | "file" | "worklog";
  entityId: string;
  action: string; // "created" | "updated" | "deleted" | "status_changed" | ...
  meta?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.activity.create({ data: input });
  } catch (err) {
    console.error("[activity] failed to log:", err);
  }
}

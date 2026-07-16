import { prisma } from "./prisma";

/** Create in-app notifications. Never throws — a failed notification must
 *  not break the action that triggered it. Push/email channels plug in here
 *  later without touching callers. */
export async function notify(input: {
  userIds: (string | null | undefined)[];
  actorId: string; // never notify the person who did it
  type: "task_assigned" | "task_status" | "comment_added" | "feedback_received";
  title: string;
  body?: string;
  link?: string;
}) {
  const targets = [...new Set(input.userIds)].filter(
    (id): id is string => !!id && id !== input.actorId
  );
  if (targets.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: targets.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
      })),
    });
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}

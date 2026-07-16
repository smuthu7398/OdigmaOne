import { prisma } from "./prisma";

/** Create in-app notifications. Never throws — a failed notification must
 *  not break the action that triggered it. */
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
    await sendExpoPush(targets, input.title, input.body, input.link);
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}

/** Deliver via Expo's push service to every registered device of the
 *  target users. Fire-and-forget; invalid tokens are pruned. */
async function sendExpoPush(
  userIds: string[],
  title: string,
  body?: string,
  link?: string
) {
  try {
    const tokens = await prisma.pushToken.findMany({
      where: { userId: { in: userIds } },
    });
    if (tokens.length === 0) return;

    // Expo accepts at most 100 messages per request
    for (let i = 0; i < tokens.length; i += 100) {
      const chunk = tokens.slice(i, i + 100);
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          chunk.map((t) => ({
            to: t.token,
            title,
            body,
            sound: "default",
            data: { link },
          }))
        ),
      });
      const result = (await res.json()) as {
        data?: { status: string; details?: { error?: string } }[];
      };

      // prune tokens Expo says are dead (uninstalled app, revoked perms)
      const dead = chunk.filter(
        (_, idx) =>
          result.data?.[idx]?.details?.error === "DeviceNotRegistered"
      );
      if (dead.length > 0) {
        await prisma.pushToken.deleteMany({
          where: { token: { in: dead.map((t) => t.token) } },
        });
      }
    }
  } catch (err) {
    console.error("[notify] expo push failed:", err);
  }
}

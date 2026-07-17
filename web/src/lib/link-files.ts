import { prisma } from "./prisma";

/** Files uploaded from the rich-text editor arrive with no task/client
 *  link. After saving content, claim any embedded /api/v1/files/<id>
 *  references so they inherit the right scope — portal users can then
 *  see team-uploaded images, and the files show up on the task/client. */
export async function linkEmbeddedFiles(
  html: string | null | undefined,
  target: { taskId?: string; clientId?: string | null }
) {
  if (!html) return;
  const ids = [...html.matchAll(/\/api\/v1\/files\/([a-z0-9]+)/gi)].map(
    (m) => m[1]
  );
  if (ids.length === 0) return;
  try {
    await prisma.attachment.updateMany({
      // only unclaimed files — never re-home an attachment that already
      // belongs to a task
      where: { id: { in: ids }, taskId: null },
      data: {
        ...(target.taskId && { taskId: target.taskId }),
        ...(target.clientId !== undefined && { clientId: target.clientId }),
      },
    });
  } catch (err) {
    console.error("[link-files] failed:", err);
  }
}

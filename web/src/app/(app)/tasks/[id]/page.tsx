import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { TaskDetail } from "@/components/tasks/task-detail";

export const metadata = { title: "Task · Odigma One" };

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = (await getSessionUser())!;
  if (!can(user, "task:read")) redirect("/dashboard");
  const { id } = await params;

  const isPortal = user.clientId !== null;
  return (
    <TaskDetail
      taskId={id}
      currentUserId={user.id}
      canUpdate={can(user, "task:update")}
      canAssign={can(user, "task:assign")}
      canComment={can(user, "comment:create")}
      canModerate={can(user, "comment:delete") && !isPortal}
      canDeleteFiles={can(user, "file:delete") && !isPortal}
      isPortal={isPortal}
    />
  );
}

import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { EditTaskView } from "@/components/tasks/edit-task-view";

export const metadata = { title: "Edit Task · Odigma One" };

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = (await getSessionUser())!;
  if (!can(user, "task:update")) redirect("/tasks");
  const { id } = await params;

  return (
    <EditTaskView
      taskId={id}
      currentUserId={user.id}
      canAssign={can(user, "task:assign")}
      isPortal={user.clientId !== null}
    />
  );
}

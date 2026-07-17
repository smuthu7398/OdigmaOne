import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { NewTaskView } from "@/components/tasks/new-task-view";

export const metadata = { title: "New Task · Odigma One" };

export default async function NewTaskPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "task:create")) redirect("/tasks");

  return (
    <NewTaskView
      canAssign={can(user, "task:assign")}
      lockedClientId={user.clientId}
    />
  );
}

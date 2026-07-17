import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { TasksView } from "@/components/tasks/tasks-view";

export const metadata = { title: "Tasks · Odigma One" };

export default async function TasksPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "task:read")) redirect("/dashboard");

  const isPortal = user.clientId !== null;
  return (
    <TasksView
      canCreate={can(user, "task:create")}
      canUpdate={can(user, "task:update")}
      canDelete={can(user, "task:delete") && !isPortal}
      canAssign={can(user, "task:assign")}
      isPortal={isPortal}
      portalClientId={user.clientId}
      currentUserId={user.id}
    />
  );
}

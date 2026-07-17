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
      // portal users can create requests but not edit/assign/delete —
      // the API enforces this too; hiding dead controls keeps the UI honest
      canUpdate={can(user, "task:update") && !isPortal}
      canDelete={can(user, "task:delete") && !isPortal}
      canAssign={can(user, "task:assign") && !isPortal}
      isPortal={isPortal}
      portalClientId={user.clientId}
    />
  );
}

import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { ProjectsView } from "@/components/projects/projects-view";

export const metadata = { title: "Projects · Odigma One" };

export default async function ProjectsPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "project:read")) redirect("/dashboard");

  return (
    <ProjectsView
      canCreate={can(user, "project:create")}
      canUpdate={can(user, "project:update")}
      canDelete={can(user, "project:delete")}
      isPortal={user.clientId !== null}
    />
  );
}

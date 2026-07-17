import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { ProjectsView } from "@/components/projects/projects-view";

export const metadata = { title: "Projects · Odigma One" };

export default async function ProjectsPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "project:read")) redirect("/dashboard");

  const isPortal = user.clientId !== null;
  return (
    <ProjectsView
      canCreate={can(user, "project:create")}
      canUpdate={can(user, "project:update") && !isPortal}
      canDelete={can(user, "project:delete") && !isPortal}
      isPortal={isPortal}
      portalClientId={user.clientId}
    />
  );
}

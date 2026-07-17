import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { NewProjectView } from "@/components/projects/new-project-view";

export const metadata = { title: "New Project · Odigma One" };

export default async function NewProjectPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "project:create")) redirect("/projects");

  return <NewProjectView lockedClientId={user.clientId} />;
}

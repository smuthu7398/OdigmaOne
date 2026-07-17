import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { EditProjectView } from "@/components/projects/edit-project-view";

export const metadata = { title: "Edit Project · Odigma One" };

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = (await getSessionUser())!;
  // portal users can't edit projects (API forbids too)
  if (!can(user, "project:update") || user.clientId) redirect("/projects");
  const { id } = await params;

  return <EditProjectView projectId={id} />;
}

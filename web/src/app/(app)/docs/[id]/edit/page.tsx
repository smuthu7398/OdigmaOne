import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { EditDocView } from "@/components/docs/edit-doc-view";

export const metadata = { title: "Edit Doc · Odigma One" };

export default async function EditDocPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = (await getSessionUser())!;
  if (!can(user, "doc:update") || user.clientId) redirect("/docs");
  const { id } = await params;
  return <EditDocView docId={id} />;
}

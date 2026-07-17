import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { EditClientView } from "@/components/clients/edit-client-view";

export const metadata = { title: "Edit Client · Odigma One" };

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = (await getSessionUser())!;
  if (!can(user, "client:update") || user.clientId) redirect("/clients");
  const { id } = await params;
  return <EditClientView clientId={id} />;
}

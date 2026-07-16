import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { ClientsView } from "@/components/clients/clients-view";

export const metadata = { title: "Clients · Odigma One" };

export default async function ClientsPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "client:read")) redirect("/dashboard");

  return (
    <ClientsView
      canCreate={can(user, "client:create")}
      canUpdate={can(user, "client:update")}
      canDelete={can(user, "client:delete")}
    />
  );
}

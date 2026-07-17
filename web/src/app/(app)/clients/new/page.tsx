import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { NewClientView } from "@/components/clients/new-client-view";

export const metadata = { title: "New Client · Odigma One" };

export default async function NewClientPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "client:create") || user.clientId) redirect("/clients");
  return <NewClientView />;
}

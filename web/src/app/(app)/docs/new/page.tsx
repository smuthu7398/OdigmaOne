import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { NewDocView } from "@/components/docs/new-doc-view";

export const metadata = { title: "New Doc · Odigma One" };

export default async function NewDocPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "doc:create") || user.clientId) redirect("/docs");
  return <NewDocView />;
}

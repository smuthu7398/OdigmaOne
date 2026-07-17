import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { DocsView } from "@/components/docs/docs-view";

export const metadata = { title: "Docs · Odigma One" };

export default async function DocsPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "doc:read")) redirect("/dashboard");

  return (
    <DocsView
      canCreate={can(user, "doc:create") && !user.clientId}
      canDelete={can(user, "doc:delete") && !user.clientId}
      isPortal={user.clientId !== null}
    />
  );
}

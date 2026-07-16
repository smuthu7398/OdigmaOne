import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { RolesView } from "@/components/roles/roles-view";

export const metadata = { title: "Roles · Odigma One" };

export default async function RolesPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "role:read") || user.clientId) redirect("/dashboard");

  return (
    <RolesView
      canCreate={can(user, "role:create")}
      canUpdate={can(user, "role:update")}
      canDelete={can(user, "role:delete")}
    />
  );
}

import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { NewUserView } from "@/components/team/new-user-view";

export const metadata = { title: "New User · Odigma One" };

export default async function NewUserPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "user:create") || user.clientId) redirect("/team");
  return <NewUserView />;
}

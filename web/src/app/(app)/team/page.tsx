import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { TeamView } from "@/components/team/team-view";

export const metadata = { title: "Team · Odigma One" };

export default async function TeamPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "user:read") || user.clientId) redirect("/dashboard");

  return (
    <TeamView
      currentUserId={user.id}
      canCreate={can(user, "user:create")}
      canUpdate={can(user, "user:update")}
    />
  );
}

import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { WorkLogView } from "@/components/work-log/work-log-view";

export const metadata = { title: "Work Log · Odigma One" };

export default async function WorkLogPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "worklog:read")) redirect("/dashboard");

  return (
    <WorkLogView
      canCreate={can(user, "worklog:create")}
      canSeeOthers={can(user, "user:read")}
      currentUserId={user.id}
    />
  );
}

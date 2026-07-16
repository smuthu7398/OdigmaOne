import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { ActivityView } from "@/components/activity/activity-view";

export const metadata = { title: "Activity · Odigma One" };

export default async function ActivityPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "activity:read")) redirect("/dashboard");
  return <ActivityView />;
}

import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { NotificationsView } from "@/components/notifications/notifications-view";

export const metadata = { title: "Notifications · Odigma One" };

export default async function NotificationsPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "notification:read")) redirect("/dashboard");
  return <NotificationsView />;
}

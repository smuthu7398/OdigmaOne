import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { CalendarView } from "@/components/tasks/calendar-view";

export const metadata = { title: "Calendar · Odigma One" };

export default async function CalendarPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "task:read")) redirect("/dashboard");
  return <CalendarView />;
}

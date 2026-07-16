import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { ReportsView } from "@/components/reports/reports-view";

export const metadata = { title: "Reports · Odigma One" };

export default async function ReportsPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "report:read")) redirect("/dashboard");
  return <ReportsView />;
}

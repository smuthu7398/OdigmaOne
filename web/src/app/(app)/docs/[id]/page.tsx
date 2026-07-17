import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { DocDetailView } from "@/components/docs/doc-detail-view";

export const metadata = { title: "Doc · Odigma One" };

export default async function DocDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = (await getSessionUser())!;
  if (!can(user, "doc:read")) redirect("/dashboard");
  const { id } = await params;

  return (
    <DocDetailView
      docId={id}
      canUpdate={can(user, "doc:update") && !user.clientId}
    />
  );
}

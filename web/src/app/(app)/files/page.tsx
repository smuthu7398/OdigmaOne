import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { FilesView } from "@/components/files/files-view";

export const metadata = { title: "Files · Odigma One" };

export default async function FilesPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "file:read")) redirect("/dashboard");
  return (
    <FilesView
      currentUserId={user.id}
      canModerate={can(user, "file:delete")}
      isPortal={user.clientId !== null}
    />
  );
}

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/rbac";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        roleName: user.roleName,
        clientId: user.clientId,
        permissions: [...user.permissions],
      }}
    >
      {children}
    </AppShell>
  );
}

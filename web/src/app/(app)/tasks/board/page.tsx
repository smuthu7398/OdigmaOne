import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { BoardView } from "@/components/tasks/board-view";

export const metadata = { title: "Board · Odigma One" };

export default async function BoardPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "task:read")) redirect("/dashboard");

  return (
    <BoardView
      canUpdate={can(user, "task:update")}
      isPortal={user.clientId !== null}
    />
  );
}

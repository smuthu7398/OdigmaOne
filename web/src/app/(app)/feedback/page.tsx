import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/rbac";
import { FeedbackView } from "@/components/feedback/feedback-view";

export const metadata = { title: "Feedback · Odigma One" };

export default async function FeedbackPage() {
  const user = (await getSessionUser())!;
  if (!can(user, "feedback:read") && !can(user, "feedback:create")) {
    redirect("/dashboard");
  }
  return (
    <FeedbackView
      canSubmit={can(user, "feedback:create")}
      isPortal={user.clientId !== null}
    />
  );
}

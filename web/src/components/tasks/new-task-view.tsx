"use client";

import { useRouter } from "next/navigation";
import { TaskForm } from "./task-form";
import { PageHeader } from "@/components/page-header";

export function NewTaskView({
  canAssign,
  lockedClientId,
}: {
  canAssign: boolean;
  lockedClientId?: string | null;
}) {
  const router = useRouter();

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <PageHeader
        backHref="/tasks"
        backLabel="Back to tasks"
        crumbs={[{ label: "Tasks", href: "/tasks" }, { label: "New" }]}
        title="New task"
        subtitle="Bugs are tasks too — just switch the type to Bug."
      />

      <TaskForm
        task={null}
        canAssign={canAssign}
        lockedClientId={lockedClientId}
        onDone={(task) => router.push(`/tasks/${task.id}`)}
        onCancel={() => router.push("/tasks")}
      />
    </div>
  );
}

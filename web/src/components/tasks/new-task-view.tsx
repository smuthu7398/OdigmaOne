"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskForm } from "./task-form";
import { BackButton } from "@/components/back-button";

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
      <div className="flex items-center gap-3">
        <BackButton href="/tasks" label="Back to tasks" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New task</h1>
          <p className="text-sm text-muted-foreground">
            Bugs are tasks too — just switch the type to Bug.
          </p>
        </div>
      </div>

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

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TaskForm } from "./task-form";

export function NewTaskView({
  canAssign,
  lockedClientId,
}: {
  canAssign: boolean;
  lockedClientId?: string | null;
}) {
  const router = useRouter();

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back to tasks">
          <Link href="/tasks">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New task</h1>
          <p className="text-sm text-muted-foreground">
            Bugs are tasks too — just set the type to Bug.
          </p>
        </div>
      </div>

      <Card>
        <CardContent>
          <TaskForm
            task={null}
            canAssign={canAssign}
            lockedClientId={lockedClientId}
            onDone={(task) => router.push(`/tasks/${task.id}`)}
            onCancel={() => router.push("/tasks")}
          />
        </CardContent>
      </Card>
    </div>
  );
}

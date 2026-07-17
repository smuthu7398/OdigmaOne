"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock } from "lucide-react";
import { api } from "@/lib/fetcher";
import { taskCode } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskForm, type TaskRow } from "./task-form";

export function EditTaskView({
  taskId,
  currentUserId,
  canAssign,
  isPortal,
}: {
  taskId: string;
  currentUserId: string;
  canAssign: boolean;
  isPortal: boolean;
}) {
  const router = useRouter();

  const taskQuery = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => api<TaskRow>(`/api/v1/tasks/${taskId}`),
  });

  if (taskQuery.isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-2xl gap-5">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-130 rounded-xl" />
      </div>
    );
  }

  const task = taskQuery.data?.data;
  if (!task) {
    return (
      <div className="grid justify-items-center gap-3 py-20 text-center">
        <p className="font-medium">Task not found</p>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/tasks">
            <ArrowLeft /> Back to tasks
          </Link>
        </Button>
      </div>
    );
  }

  // content edits belong to the creator alone
  if (task.assignedBy.id !== currentUserId) {
    return (
      <div className="grid justify-items-center gap-3 py-20 text-center">
        <div className="rounded-2xl bg-muted p-3">
          <Lock className="size-5 text-muted-foreground" />
        </div>
        <p className="font-medium">
          Only {task.assignedBy.name} can edit this task
        </p>
        <p className="text-sm text-muted-foreground">
          Tasks are editable by the person who created them.
        </p>
        <Button asChild variant="outline" className="rounded-full">
          <Link href={`/tasks/${task.id}`}>
            <ArrowLeft /> Back to {taskCode(task.number)}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5">
      <div className="flex items-center gap-3">
        <Button
          asChild
          variant="ghost"
          size="icon"
          aria-label="Back to task"
        >
          <Link href={`/tasks/${task.id}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit {taskCode(task.number)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {task.client.name}
            {task.project && ` · ${task.project.name}`}
          </p>
        </div>
      </div>

      <Card>
        <CardContent>
          <TaskForm
            task={task}
            canAssign={canAssign}
            lockedClientId={isPortal ? task.clientId : undefined}
            onDone={() => router.push(`/tasks/${task.id}`)}
            onCancel={() => router.push(`/tasks/${task.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

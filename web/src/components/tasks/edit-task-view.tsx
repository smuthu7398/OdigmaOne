"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, FolderKanban, Lock } from "lucide-react";
import { HeaderChip, PageHeader } from "@/components/page-header";
import { api } from "@/lib/fetcher";
import { taskCode } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskForm, type TaskRow } from "./task-form";
import { BackButton } from "@/components/back-button";

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
      <div className="mx-auto grid w-full max-w-5xl gap-5">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
          <Skeleton className="h-100 rounded-xl" />
          <Skeleton className="h-100 rounded-xl" />
        </div>
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
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <PageHeader
        backHref={`/tasks/${task.id}`}
        backLabel="Back to task"
        crumbs={[
          { label: "Tasks", href: "/tasks" },
          { label: taskCode(task.number), href: `/tasks/${task.id}`, mono: true },
          { label: "Edit" },
        ]}
        title={`Edit ${taskCode(task.number)}`}
        chips={
          <>
            <HeaderChip icon={Building2}>{task.client.name}</HeaderChip>
            {task.project && (
              <HeaderChip icon={FolderKanban}>{task.project.name}</HeaderChip>
            )}
          </>
        }
      />

      <TaskForm
        task={task}
        canAssign={canAssign}
        lockedClientId={isPortal ? task.clientId : undefined}
        onDone={() => router.push(`/tasks/${task.id}`)}
        onCancel={() => router.push(`/tasks/${task.id}`)}
      />
    </div>
  );
}

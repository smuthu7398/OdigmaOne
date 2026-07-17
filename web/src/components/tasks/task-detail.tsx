"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bug,
  Building2,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Clock,
  FolderKanban,
  Loader2,
  Pencil,
  SendHorizonal,
  Trash2,
} from "lucide-react";
import type { TaskStatus } from "@odigma/shared";
import { api } from "@/lib/fetcher";
import {
  formatDate,
  initials,
  relativeTime,
  TASK_PRIORITY_META,
  TASK_STATUS_META,
  taskCode,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { decorateRichText } from "@/lib/richtext";
import { type TaskRow } from "./task-form";
import { TaskAttachments } from "./task-attachments";
import { HeaderChip, PageHeader } from "@/components/page-header";
import { SectionLabel } from "@/components/section-label";

type CommentRow = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; image: string | null };
};

export function TaskDetail({
  taskId,
  currentUserId,
  canUpdate,
  canAssign,
  canComment,
  canModerate,
  canDeleteFiles = false,
  isPortal = false,
}: {
  taskId: string;
  currentUserId: string;
  canUpdate: boolean;
  canAssign: boolean;
  canComment: boolean;
  canModerate: boolean;
  /** admin-only file deletion (file:delete) */
  canDeleteFiles?: boolean;
  isPortal?: boolean;
}) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  // remounts the composer (clears it) after a successful post
  const [composerKey, setComposerKey] = useState(0);

  const taskQuery = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => api<TaskRow>(`/api/v1/tasks/${taskId}`),
  });

  const commentsQuery = useQuery({
    queryKey: ["comments", taskId],
    queryFn: () => api<CommentRow[]>(`/api/v1/tasks/${taskId}/comments`),
  });

  const statusMutation = useMutation({
    mutationFn: (status: TaskStatus) =>
      api(`/api/v1/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_, status) => {
      toast.success(`Status → ${TASK_STATUS_META[status].label}`);
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) =>
      api(`/api/v1/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      setComment("");
      setComposerKey((k) => k + 1);
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/v1/comments/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Comment deleted.");
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (taskQuery.isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const task = taskQuery.data?.data;
  if (!task) {
    return (
      <div className="grid justify-items-center gap-3 py-20 text-center">
        <p className="font-medium">Task not found</p>
        <p className="text-sm text-muted-foreground">
          It may have been deleted, or you don&apos;t have access to it.
        </p>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/tasks">
            <ArrowLeft /> Back to tasks
          </Link>
        </Button>
      </div>
    );
  }

  const comments = commentsQuery.data?.data ?? [];
  // content edits belong to the creator alone
  const canEditTask = canUpdate && task.assignedBy.id === currentUserId;
  // status/progress always stay with the team
  const canChangeStatus = canUpdate && !isPortal;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <PageHeader
        backHref="/tasks"
        backLabel="Back to tasks"
        crumbs={[
          { label: "Tasks", href: "/tasks" },
          { label: taskCode(task.number), mono: true },
        ]}
        title={task.title}
        titleBadge={
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
              task.type === "BUG"
                ? "bg-status-blocked/15 text-status-blocked"
                : "bg-primary/10 text-primary"
            )}
          >
            {task.type === "BUG" ? (
              <Bug className="size-3.5" />
            ) : (
              <CheckSquare className="size-3.5" />
            )}
            {task.type === "BUG" ? "Bug" : "Task"}
          </span>
        }
        chips={
          <>
            <HeaderChip icon={Building2}>{task.client.name}</HeaderChip>
            {task.project && (
              <HeaderChip icon={FolderKanban}>{task.project.name}</HeaderChip>
            )}
          </>
        }
        actions={
          canEditTask ? (
            <Button
              asChild
              variant="outline"
              className="rounded-full bg-card shadow-sm"
            >
              <Link href={`/tasks/${task.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_330px]">
        <div className="grid content-start gap-4">
          <Card>
            <CardContent className="grid gap-2">
              <SectionLabel>Description</SectionLabel>
              {task.description ? (
                <div className="rounded-xl bg-muted/40 p-4">
                  {task.description.trimStart().startsWith("<") ? (
                    // rich text — sanitized server-side on every write
                    <div
                      className="rich-text text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: decorateRichText(task.description),
                      }}
                    />
                  ) : (
                    // legacy plain-text descriptions
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {task.description}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No description yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-4">
              <SectionLabel>Comments ({comments.length})</SectionLabel>
              {commentsQuery.isLoading ? (
                <Skeleton className="h-16" />
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No comments yet — start the discussion.
                </p>
              ) : (
                <ul className="grid gap-4">
                  {comments.map((c) => (
                    <li key={c.id} className="flex gap-3">
                      <Avatar className="mt-0.5 size-8">
                        <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                          {initials(c.author.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{c.author.name}</span>{" "}
                          <span
                            className="text-xs text-muted-foreground"
                            title={new Date(c.createdAt).toLocaleString("en-IN")}
                          >
                            {relativeTime(c.createdAt)}
                          </span>
                        </p>
                        {c.body.trimStart().startsWith("<") ? (
                          // rich text — sanitized server-side on write
                          <div
                            className="rich-text text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: decorateRichText(c.body),
                            }}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {c.body}
                          </p>
                        )}
                      </div>
                      {(c.author.id === currentUserId || canModerate) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Delete comment"
                          onClick={() => deleteCommentMutation.mutate(c.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {canComment && (
                <div className="grid gap-2">
                  <RichTextEditor
                    key={composerKey}
                    value={comment}
                    onChange={setComment}
                    placeholder="Write a comment… paste screenshots right here"
                    minHeight="min-h-20"
                  />
                  <Button
                    className="justify-self-end rounded-full px-5"
                    disabled={commentMutation.isPending || !comment.trim()}
                    onClick={() => commentMutation.mutate(comment)}
                  >
                    {commentMutation.isPending ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <SendHorizonal className="size-4" />
                    )}
                    Post comment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <TaskAttachments
            taskId={taskId}
            canUpload={canComment /* same audience: team + portal */}
            canDelete={canDeleteFiles}
          />
        </div>

        <Card className="lg:sticky lg:top-20">
          <CardContent className="grid gap-5 text-sm">
            <div className="grid gap-2">
              <SectionLabel>Status</SectionLabel>
              {canChangeStatus ? (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(TASK_STATUS_META).map(([value, meta]) => {
                    const active = task.status === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          !active && statusMutation.mutate(value as TaskStatus)
                        }
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                          meta.badge,
                          active
                            ? "ring-2 ring-current"
                            : "opacity-45 hover:opacity-100"
                        )}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Badge
                  className={`w-fit rounded-full border-0 ${TASK_STATUS_META[task.status].badge}`}
                >
                  {TASK_STATUS_META[task.status].label}
                </Badge>
              )}
            </div>

            <div className="grid gap-2">
              <SectionLabel>Priority</SectionLabel>
              <Badge
                className={`w-fit rounded-full border-0 px-3 py-1 ${TASK_PRIORITY_META[task.priority].badge}`}
              >
                {TASK_PRIORITY_META[task.priority].label}
              </Badge>
            </div>

            <div className="grid gap-2">
              <SectionLabel>Assignees ({task.assignees.length})</SectionLabel>
              {task.assignees.length > 0 ? (
                <div
                  className="grid gap-1.5"
                  title={task.assignees.map((a) => a.user.name).join(", ")}
                >
                  <div className="flex -space-x-2">
                    {task.assignees.slice(0, 6).map((a) => (
                      <Avatar
                        key={a.user.id}
                        className="size-8 ring-2 ring-card"
                      >
                        <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                          {initials(a.user.name)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {task.assignees.length > 6 && (
                      <span className="z-10 flex size-8 items-center justify-center rounded-full bg-muted text-[10px] font-semibold ring-2 ring-card">
                        +{task.assignees.length - 6}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {task.assignees
                      .slice(0, 3)
                      .map((a) => a.user.name.split(" ")[0])
                      .join(", ")}
                    {task.assignees.length > 3 &&
                      ` +${task.assignees.length - 3} more`}
                  </p>
                </div>
              ) : (
                <span className="text-muted-foreground">Unassigned</span>
              )}
            </div>

            <div className="grid gap-2">
              <SectionLabel>Progress</SectionLabel>
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums">
                  {task.progress}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-xl bg-muted/40 p-3">
              <div className="grid gap-1">
                <SectionLabel>
                  <CalendarDays className="mr-1 inline size-3" />
                  Due date
                </SectionLabel>
                <p className="font-medium tabular-nums">
                  {formatDate(task.dueDate)}
                </p>
              </div>
              <div className="grid gap-1">
                <SectionLabel>
                  <Clock className="mr-1 inline size-3" />
                  Estimate
                </SectionLabel>
                <p className="font-medium tabular-nums">
                  {task.estimatedHours ? `${Number(task.estimatedHours)}h` : "—"}
                </p>
              </div>
              <div className="col-span-2 grid gap-1">
                <SectionLabel>Actual hours</SectionLabel>
                <p className="font-medium tabular-nums">
                  {task.actualHours ? `${Number(task.actualHours)}h` : "—"}
                </p>
              </div>
            </div>

            <p className="border-t pt-4 text-xs text-muted-foreground">
              Created by{" "}
              <span className="font-medium text-foreground">
                {task.assignedBy.name}
              </span>{" "}
              · {formatDate(task.createdAt)}
            </p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

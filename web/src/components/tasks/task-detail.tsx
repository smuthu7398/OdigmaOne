"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bug,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskFormDialog, type TaskRow } from "./task-form-dialog";
import { TaskAttachments } from "./task-attachments";

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
}: {
  taskId: string;
  currentUserId: string;
  canUpdate: boolean;
  canAssign: boolean;
  canComment: boolean;
  canModerate: boolean;
}) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [comment, setComment] = useState("");

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

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back to tasks">
          <Link href="/tasks">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            {task.type === "BUG" && (
              <Bug className="size-3.5 text-status-blocked" />
            )}
            {taskCode(task.number)}
            <span>·</span>
            {task.client.name}
            {task.project && (
              <>
                <span>·</span>
                {task.project.name}
              </>
            )}
          </p>
          <h1 className="text-xl font-semibold tracking-tight">{task.title}</h1>
        </div>
        {canUpdate && (
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => setEditOpen(true)}
          >
            <Pencil /> Edit
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_290px]">
        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Description</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {task.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No description yet.
                </p>
              )}
            </CardContent>
          </Card>

          <TaskAttachments
            taskId={taskId}
            currentUserId={currentUserId}
            canUpload={canComment /* same audience: team + portal */}
            canModerate={canModerate}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Comments{" "}
                <span className="text-muted-foreground">
                  ({comments.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
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
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {c.body}
                        </p>
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
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (comment.trim()) commentMutation.mutate(comment.trim());
                  }}
                >
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write a comment…"
                    rows={2}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        e.preventDefault();
                        if (comment.trim())
                          commentMutation.mutate(comment.trim());
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="self-end rounded-full"
                    disabled={commentMutation.isPending || !comment.trim()}
                    aria-label="Post comment"
                  >
                    {commentMutation.isPending ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <SendHorizonal className="size-4" />
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardContent className="grid gap-4 text-sm">
            <div className="grid gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </p>
              {canUpdate ? (
                <Select
                  value={task.status}
                  onValueChange={(v) => statusMutation.mutate(v as TaskStatus)}
                >
                  <SelectTrigger
                    size="sm"
                    className={`w-fit gap-1.5 rounded-full border-0 px-3 text-xs font-semibold ${TASK_STATUS_META[task.status].badge}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_STATUS_META).map(([value, meta]) => (
                      <SelectItem key={value} value={value}>
                        {meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge
                  className={`w-fit rounded-full border-0 ${TASK_STATUS_META[task.status].badge}`}
                >
                  {TASK_STATUS_META[task.status].label}
                </Badge>
              )}
            </div>

            <div className="grid gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Priority
              </p>
              <Badge
                className={`w-fit rounded-full border-0 ${TASK_PRIORITY_META[task.priority].badge}`}
              >
                {TASK_PRIORITY_META[task.priority].label}
              </Badge>
            </div>

            <div className="grid gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Assignee
              </p>
              {task.assignedTo ? (
                <span className="inline-flex items-center gap-2">
                  <Avatar className="size-6">
                    <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                      {initials(task.assignedTo.name)}
                    </AvatarFallback>
                  </Avatar>
                  {task.assignedTo.name}
                </span>
              ) : (
                <span className="text-muted-foreground">Unassigned</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Due date
                </p>
                <p className="tabular-nums">{formatDate(task.dueDate)}</p>
              </div>
              <div className="grid gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Progress
                </p>
                <p className="tabular-nums">{task.progress}%</p>
              </div>
              <div className="grid gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Estimated
                </p>
                <p className="tabular-nums">
                  {task.estimatedHours ? `${Number(task.estimatedHours)}h` : "—"}
                </p>
              </div>
              <div className="grid gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Actual
                </p>
                <p className="tabular-nums">
                  {task.actualHours ? `${Number(task.actualHours)}h` : "—"}
                </p>
              </div>
            </div>

            <div className="grid gap-1.5 border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Created by {task.assignedBy.name} ·{" "}
                {formatDate(task.createdAt)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <TaskFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        task={task}
        canAssign={canAssign}
      />
    </div>
  );
}

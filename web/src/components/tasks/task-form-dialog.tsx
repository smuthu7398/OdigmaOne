"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import {
  createTaskSchema,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from "@odigma/shared";
import { api } from "@/lib/fetcher";
import { TASK_PRIORITY_META, TASK_STATUS_META } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TaskRow = {
  id: string;
  number: number;
  type: TaskType;
  clientId: string;
  projectId: string | null;
  title: string;
  description: string | null;
  category: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  estimatedHours: string | null;
  actualHours: string | null;
  dueDate: string | null;
  createdAt: string;
  client: { id: string; name: string };
  project: { id: string; name: string } | null;
  assignedTo: { id: string; name: string; image: string | null } | null;
  assignedBy: { id: string; name: string };
  _count?: { comments: number; attachments: number };
};

const taskFormSchema = createTaskSchema
  .omit({ dueDate: true, estimatedHours: true })
  .extend({
    dueDate: z.string().optional(),
    estimatedHours: z.string().optional(),
  });
type TaskFormValues = z.input<typeof taskFormSchema>;

const NONE = "__none__";

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  canAssign,
  defaultClientId,
  lockedClientId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskRow | null;
  canAssign: boolean;
  defaultClientId?: string;
  /** portal users: client is fixed to their own — no dropdown */
  lockedClientId?: string | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = task !== null;

  const clientsQuery = useQuery({
    queryKey: ["clients", "options"],
    queryFn: () =>
      api<{ id: string; name: string }[]>(
        "/api/v1/clients?pageSize=100&status=ACTIVE"
      ),
    enabled: open && !lockedClientId,
  });

  const usersQuery = useQuery({
    queryKey: ["users", "options"],
    queryFn: () => api<{ id: string; name: string }[]>("/api/v1/users"),
    enabled: open && canAssign,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: standardSchemaResolver(taskFormSchema),
    defaultValues: { type: "TASK", priority: "MEDIUM", status: "TODO" },
  });

  const clientId = watch("clientId");

  const projectsQuery = useQuery({
    queryKey: ["projects", "options", clientId],
    queryFn: () =>
      api<{ id: string; name: string }[]>(
        `/api/v1/projects?pageSize=100&clientId=${clientId}`
      ),
    enabled: open && !!clientId,
  });

  useEffect(() => {
    if (open) {
      reset({
        type: task?.type ?? "TASK",
        clientId: task?.clientId ?? lockedClientId ?? defaultClientId ?? "",
        projectId: task?.projectId ?? undefined,
        title: task?.title ?? "",
        description: task?.description ?? undefined,
        category: task?.category ?? undefined,
        priority: task?.priority ?? "MEDIUM",
        status: task?.status ?? "TODO",
        assignedToId: task?.assignedTo?.id ?? undefined,
        estimatedHours: task?.estimatedHours ?? undefined,
        dueDate: task?.dueDate?.slice(0, 10) ?? undefined,
      });
    }
  }, [open, task, defaultClientId, reset]);

  const mutation = useMutation({
    mutationFn: (values: TaskFormValues) => {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== "" && v !== undefined)
      );
      return isEdit
        ? api(`/api/v1/tasks/${task.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : api("/api/v1/tasks", {
            method: "POST",
            body: JSON.stringify(payload),
          });
    },
    onSuccess: (_, values) => {
      toast.success(isEdit ? "Task updated." : "Task created.", {
        description: values.title,
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit ${`ODG-${task.number}`}` : "New task"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the task's details."
              : "Bugs are tasks too — just set the type to Bug."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          className="grid gap-4"
          noValidate
        >
          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g. Homepage banner revamp"
              aria-invalid={!!errors.title}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {!lockedClientId && (
              <div className="grid gap-2">
                <Label>Client *</Label>
                <Select
                  value={clientId || undefined}
                  onValueChange={(v) => {
                    setValue("clientId", v, { shouldValidate: true });
                    setValue("projectId", undefined);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        clientsQuery.isLoading ? "Loading…" : "Select a client"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(clientsQuery.data?.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clientId && (
                  <p className="text-sm text-destructive">
                    {errors.clientId.message}
                  </p>
                )}
              </div>
            )}
            <div className="grid gap-2">
              <Label>Project</Label>
              <Select
                value={watch("projectId") ?? NONE}
                onValueChange={(v) =>
                  setValue("projectId", v === NONE ? undefined : v)
                }
                disabled={!clientId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No project</SelectItem>
                  {(projectsQuery.data?.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={watch("type")}
                onValueChange={(v) => setValue("type", v as TaskType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TASK">Task</SelectItem>
                  <SelectItem value="BUG">Bug</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select
                value={watch("priority")}
                onValueChange={(v) => setValue("priority", v as TaskPriority)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_PRIORITY_META).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!lockedClientId && (
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v as TaskStatus)}
                >
                  <SelectTrigger className="w-full">
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
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {canAssign && (
              <div className="grid gap-2">
                <Label>{lockedClientId ? "Assign to (optional)" : "Assignee"}</Label>
                <Select
                  value={watch("assignedToId") ?? NONE}
                  onValueChange={(v) =>
                    setValue("assignedToId", v === NONE ? undefined : v)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>
                      {lockedClientId ? "Your account manager" : "Unassigned"}
                    </SelectItem>
                    {(usersQuery.data?.data ?? []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" type="date" {...register("dueDate")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="estimatedHours">Est. hours</Label>
              <Input
                id="estimatedHours"
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g. 8"
                {...register("estimatedHours")}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              placeholder="What needs to be done? For bugs: steps to reproduce, expected vs actual."
              {...register("description")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-full"
            >
              {mutation.isPending && <Loader2 className="animate-spin" />}
              {isEdit ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

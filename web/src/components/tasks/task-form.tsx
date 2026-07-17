"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bug, CalendarDays, CheckSquare, Clock, Loader2 } from "lucide-react";
import { z } from "zod";
import {
  createTaskSchema,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from "@odigma/shared";
import { api } from "@/lib/fetcher";
import { TASK_PRIORITY_META, TASK_STATUS_META } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
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
  assignees: { user: { id: string; name: string; image: string | null } }[];
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

/** The task form — a two-column composition: the work itself on the left,
 *  routing details on the right. Used by /tasks/new and /tasks/:id/edit. */
export function TaskForm({
  task,
  canAssign,
  lockedClientId,
  onDone,
  onCancel,
}: {
  task: TaskRow | null; // null = create
  canAssign: boolean;
  /** portal users: client is fixed to their own — no dropdown */
  lockedClientId?: string | null;
  onDone: (task: TaskRow) => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = task !== null;

  const clientsQuery = useQuery({
    queryKey: ["clients", "options"],
    queryFn: () =>
      api<{ id: string; name: string }[]>(
        "/api/v1/clients?pageSize=100&status=ACTIVE"
      ),
    enabled: !lockedClientId,
  });

  const usersQuery = useQuery({
    queryKey: ["users", "options"],
    queryFn: () => api<{ id: string; name: string }[]>("/api/v1/users"),
  });
  const assigneesLocked = isEdit && !canAssign;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: standardSchemaResolver(taskFormSchema),
    defaultValues: {
      type: task?.type ?? "TASK",
      clientId: task?.clientId ?? lockedClientId ?? "",
      projectId: task?.projectId ?? undefined,
      title: task?.title ?? "",
      description: task?.description ?? undefined,
      category: task?.category ?? undefined,
      priority: task?.priority ?? "MEDIUM",
      status: task?.status ?? "TODO",
      assigneeIds: task?.assignees.map((a) => a.user.id) ?? [],
      estimatedHours: task?.estimatedHours ?? undefined,
      dueDate: task?.dueDate?.slice(0, 10) ?? undefined,
    },
  });

  const clientId = watch("clientId");
  const type = watch("type");
  const priority = watch("priority");
  const status = watch("status");

  const projectsQuery = useQuery({
    queryKey: ["projects", "options", clientId],
    queryFn: () =>
      api<{ id: string; name: string }[]>(
        `/api/v1/projects?pageSize=100&clientId=${clientId}`
      ),
    enabled: !!clientId,
  });

  const mutation = useMutation({
    mutationFn: (values: TaskFormValues) => {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== "" && v !== undefined)
      );
      return isEdit
        ? api<TaskRow>(`/api/v1/tasks/${task.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : api<TaskRow>("/api/v1/tasks", {
            method: "POST",
            body: JSON.stringify(payload),
          });
    },
    onSuccess: (result, values) => {
      toast.success(isEdit ? "Task updated." : "Task created.", {
        description: values.title,
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task"] });
      onDone(result.data);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <form
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      className="grid gap-4"
      noValidate
    >
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_330px]">
        {/* ——— the work itself ——— */}
        <Card>
          <CardContent className="grid gap-5">
            {/* Task | Bug segmented switch */}
            <div className="flex w-fit rounded-full border bg-muted/50 p-0.5">
              {(
                [
                  { value: "TASK", label: "Task", icon: CheckSquare },
                  { value: "BUG", label: "Bug", icon: Bug },
                ] as const
              ).map((option) => {
                const active = type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setValue("type", option.value)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                      active
                        ? option.value === "BUG"
                          ? "bg-status-blocked text-white shadow-sm"
                          : "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <option.icon className="size-3.5" />
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-1.5">
              <input
                placeholder={
                  type === "BUG"
                    ? "What's broken? e.g. Tower launch page not loading"
                    : "What needs to be done? e.g. Homepage banner revamp"
                }
                aria-invalid={!!errors.title}
                className="w-full border-0 bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50"
                {...register("title")}
              />
              <div
                className={cn(
                  "h-px w-full",
                  errors.title ? "bg-destructive" : "bg-border"
                )}
              />
              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <SectionLabel>Description</SectionLabel>
              <Textarea
                rows={8}
                className="min-h-44 resize-y border-0 bg-muted/40 p-4 shadow-none focus-visible:ring-1"
                placeholder={
                  type === "BUG"
                    ? "Steps to reproduce, expected vs actual, browser/device…"
                    : "Context, goals, links, acceptance criteria…"
                }
                {...register("description")}
              />
            </div>
          </CardContent>
        </Card>

        {/* ——— routing details ——— */}
        <Card className="lg:sticky lg:top-20">
          <CardContent className="grid gap-5">
            {!lockedClientId && (
              <div className="grid gap-2">
                <SectionLabel>Client *</SectionLabel>
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
              <SectionLabel>Project</SectionLabel>
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

            <div className="grid gap-2">
              <SectionLabel>
                Assign to * {assigneesLocked && "(needs assign permission)"}
              </SectionLabel>
              <MultiSelect
                options={(usersQuery.data?.data ?? []).map((u) => ({
                  label: u.name,
                  value: u.id,
                }))}
                value={watch("assigneeIds") ?? []}
                onValueChange={(ids) =>
                  setValue("assigneeIds", ids, { shouldValidate: true })
                }
                placeholder={
                  usersQuery.isLoading
                    ? "Loading team…"
                    : "Search & select people"
                }
                searchPlaceholder="Search team members…"
                disabled={assigneesLocked}
              />
              {errors.assigneeIds && (
                <p className="text-sm text-destructive">
                  {errors.assigneeIds.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <SectionLabel>Priority</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(TASK_PRIORITY_META).map(([value, meta]) => {
                  const active = priority === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setValue("priority", value as TaskPriority)
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
            </div>

            {!lockedClientId && (
              <div className="grid gap-2">
                <SectionLabel>Status</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(TASK_STATUS_META).map(([value, meta]) => {
                    const active = status === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setValue("status", value as TaskStatus)}
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
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <SectionLabel>
                  <CalendarDays className="mr-1 inline size-3" />
                  Due date
                </SectionLabel>
                <Input type="date" {...register("dueDate")} />
              </div>
              <div className="grid gap-2">
                <SectionLabel>
                  <Clock className="mr-1 inline size-3" />
                  Estimate
                </SectionLabel>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="hours"
                  {...register("estimatedHours")}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-full px-6 shadow-[0_4px_18px_-4px_var(--primary-glow)]"
        >
          {mutation.isPending && <Loader2 className="animate-spin" />}
          {isEdit ? "Save changes" : "Create task"}
        </Button>
      </div>
    </form>
  );
}

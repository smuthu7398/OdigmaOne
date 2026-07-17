"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Bug } from "lucide-react";
import type { TaskStatus } from "@odigma/shared";
import { api } from "@/lib/fetcher";
import {
  formatDate,
  initials,
  TASK_PRIORITY_META,
  TASK_STATUS_META,
  taskCode,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ViewSwitcher } from "./view-switcher";
import type { TaskRow } from "./task-form";

const COLUMNS: TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
  "DONE",
];

function TaskCard({
  task,
  dragging,
}: {
  task: TaskRow;
  dragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-2 rounded-xl border bg-card p-3 shadow-sm transition-shadow",
        dragging && "rotate-2 shadow-lg ring-2 ring-primary/40"
      )}
    >
      <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
        {task.type === "BUG" && <Bug className="size-3 text-status-blocked" />}
        {taskCode(task.number)}
        <Badge
          className={`ml-auto rounded-full border-0 px-2 py-0 text-[10px] ${TASK_PRIORITY_META[task.priority].badge}`}
        >
          {TASK_PRIORITY_META[task.priority].label}
        </Badge>
      </div>
      <Link
        href={`/tasks/${task.id}`}
        className="text-sm font-medium leading-snug hover:text-primary"
      >
        {task.title}
      </Link>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="truncate">{task.client.name}</span>
        <span className="ml-auto tabular-nums">
          {task.dueDate ? formatDate(task.dueDate).replace(/ \d{4}$/, "") : ""}
        </span>
        {task.assignees.length > 0 && (
          <span
            className="flex -space-x-1.5"
            title={task.assignees.map((a) => a.user.name).join(", ")}
          >
            {task.assignees.slice(0, 3).map((a) => (
              <Avatar key={a.user.id} className="size-5 ring-1 ring-card">
                <AvatarFallback className="bg-primary/15 text-[9px] font-semibold text-primary">
                  {initials(a.user.name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

function DraggableCard({
  task,
  canDrag,
}: {
  task: TaskRow;
  canDrag: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled: !canDrag,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        canDrag && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30"
      )}
    >
      <TaskCard task={task} />
    </div>
  );
}

function Column({
  status,
  tasks,
  canDrag,
}: {
  status: TaskStatus;
  tasks: TaskRow[];
  canDrag: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = TASK_STATUS_META[status];
  return (
    <div className="flex w-68 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={`size-2 rounded-full ${meta.dot}`} />
        <p className="text-xs font-semibold uppercase tracking-wide">
          {meta.label}
        </p>
        <span className="rounded-full bg-muted px-2 text-xs font-semibold text-muted-foreground tabular-nums">
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "grid flex-1 content-start gap-2 rounded-xl border border-dashed p-2 transition-colors",
          isOver ? "border-primary bg-primary/5" : "border-transparent bg-muted/40"
        )}
      >
        {tasks.map((task) => (
          <DraggableCard key={task.id} task={task} canDrag={canDrag} />
        ))}
        {tasks.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {isOver ? "Drop here" : "No tasks"}
          </p>
        )}
      </div>
    </div>
  );
}

export function BoardView({
  canUpdate,
  isPortal,
}: {
  canUpdate: boolean;
  isPortal: boolean;
}) {
  const queryClient = useQueryClient();
  const [clientFilter, setClientFilter] = useState("ALL");
  const [activeTask, setActiveTask] = useState<TaskRow | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const clientsQuery = useQuery({
    queryKey: ["clients", "options"],
    queryFn: () =>
      api<{ id: string; name: string }[]>(
        "/api/v1/clients?pageSize=100&status=ACTIVE"
      ),
    enabled: !isPortal,
  });

  const queryKey = ["tasks", "board", clientFilter];
  const query = useQuery({
    queryKey,
    queryFn: () =>
      api<TaskRow[]>(
        "/api/v1/tasks?pageSize=100&sort=-createdAt" +
          (clientFilter !== "ALL" ? `&clientId=${clientFilter}` : "")
      ),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      api(`/api/v1/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onError: (err: Error) => {
      toast.error(err.message);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const tasks = query.data?.data ?? [];

  function onDragStart(event: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === event.active.id) ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const taskId = String(event.active.id);
    const newStatus = event.over?.id as TaskStatus | undefined;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !newStatus || task.status === newStatus) return;

    // optimistic: move the card instantly, server sync in background
    queryClient.setQueryData(
      queryKey,
      (old: { data: TaskRow[] } | undefined) =>
        old && {
          ...old,
          data: old.data.map((t) =>
            t.id === taskId ? { ...t, status: newStatus } : t
          ),
        }
    );
    moveMutation.mutate({ id: taskId, status: newStatus });
    toast.success(
      `${taskCode(task.number)} → ${TASK_STATUS_META[newStatus].label}`
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {canUpdate ? "Drag cards between columns" : "Board view"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!isPortal && (
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All clients</SelectItem>
                {(clientsQuery.data?.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <ViewSwitcher />
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex gap-3 overflow-x-auto">
          {COLUMNS.map((c) => (
            <Skeleton key={c} className="h-80 w-68 shrink-0 rounded-xl" />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-2">
            {COLUMNS.map((status) => (
              <Column
                key={status}
                status={status}
                tasks={tasks
                  .filter((t) => t.status === status)
                  .sort(
                    (a, b) =>
                      ["URGENT", "HIGH", "MEDIUM", "LOW"].indexOf(a.priority) -
                      ["URGENT", "HIGH", "MEDIUM", "LOW"].indexOf(b.priority)
                  )}
                canDrag={canUpdate}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} dragging />}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

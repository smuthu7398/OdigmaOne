"use client";

import { useState } from "react";
import Link from "next/link";
import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
import { Bug, ChevronDown, Loader2 } from "lucide-react";
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

/** cards fetched per column at a time — Load more pulls the next batch */
const PAGE = 25;

type ColumnData = { tasks: TaskRow[]; total: number; loading: boolean };

function TaskCard({ task, dragging }: { task: TaskRow; dragging?: boolean }) {
  return (
    <div
      className={cn(
        "grid gap-2 rounded-xl border bg-card p-3 shadow-xs transition-shadow hover:shadow-sm",
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

function DraggableCard({ task, canDrag }: { task: TaskRow; canDrag: boolean }) {
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
  data,
  canDrag,
  onLoadMore,
  loadingMore,
}: {
  status: TaskStatus;
  data: ColumnData;
  canDrag: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = TASK_STATUS_META[status];
  const remaining = data.total - data.tasks.length;

  return (
    <div
      className={cn(
        // fixed width below xl (board scrolls); fluid at xl+ so all five
        // columns share the viewport with no horizontal scrollbar
        "flex h-full w-64 shrink-0 flex-col rounded-2xl bg-muted/50 transition-shadow xl:w-auto xl:min-w-0 xl:flex-1 xl:shrink",
        isOver && "ring-2 ring-primary/40"
      )}
    >
      <div className="flex items-center gap-2 px-3.5 pb-2 pt-3">
        <span className={`size-2 rounded-full ${meta.dot}`} />
        <p className="text-xs font-semibold uppercase tracking-wide">
          {meta.label}
        </p>
        <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground shadow-xs tabular-nums">
          {data.total}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className="scrollbar-slim grid min-h-0 flex-1 content-start gap-2 overflow-y-auto px-2 pb-2"
      >
        {data.loading ? (
          <>
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </>
        ) : data.tasks.length === 0 ? (
          <p
            className={cn(
              "rounded-xl border border-dashed py-8 text-center text-xs",
              isOver
                ? "border-primary/50 text-primary"
                : "border-border/60 text-muted-foreground"
            )}
          >
            {isOver ? "Drop here" : "No tasks"}
          </p>
        ) : (
          <>
            {data.tasks.map((task) => (
              <DraggableCard key={task.id} task={task} canDrag={canDrag} />
            ))}
            {remaining > 0 && (
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {loadingMore ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
                Load {Math.min(PAGE, remaining)} more ({remaining} left)
              </button>
            )}
          </>
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
  const [limits, setLimits] = useState<Record<TaskStatus, number>>(
    Object.fromEntries(COLUMNS.map((s) => [s, PAGE])) as Record<
      TaskStatus,
      number
    >
  );
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

  const colKey = (status: TaskStatus) => [
    "tasks",
    "board",
    clientFilter,
    status,
    limits[status],
  ];

  // one paginated query per column — 500 tasks never load at once
  const results = useQueries({
    queries: COLUMNS.map((status) => ({
      queryKey: colKey(status),
      queryFn: () =>
        api<TaskRow[]>(
          `/api/v1/tasks?pageSize=${limits[status]}&status=${status}&sort=-priority` +
            (clientFilter !== "ALL" ? `&clientId=${clientFilter}` : "")
        ),
      placeholderData: keepPreviousData,
    })),
  });

  const columns: Record<TaskStatus, ColumnData> = Object.fromEntries(
    COLUMNS.map((status, i) => [
      status,
      {
        tasks: results[i].data?.data ?? [],
        total: results[i].data?.meta?.total ?? 0,
        loading: results[i].isLoading,
      },
    ])
  ) as Record<TaskStatus, ColumnData>;

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      api(`/api/v1/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  function onDragStart(event: DragStartEvent) {
    for (const status of COLUMNS) {
      const task = columns[status].tasks.find((t) => t.id === event.active.id);
      if (task) {
        setActiveTask(task);
        return;
      }
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const taskId = String(event.active.id);
    const target = event.over?.id as TaskStatus | undefined;
    if (!target) return;

    const source = COLUMNS.find((s) =>
      columns[s].tasks.some((t) => t.id === taskId)
    );
    if (!source || source === target) return;
    const task = columns[source].tasks.find((t) => t.id === taskId)!;

    // optimistic: move the card across the two column caches instantly
    type Cached = { data: TaskRow[]; meta?: { total: number } };
    queryClient.setQueryData(colKey(source), (old: Cached | undefined) =>
      old && {
        ...old,
        data: old.data.filter((t) => t.id !== taskId),
        meta: old.meta && { ...old.meta, total: old.meta.total - 1 },
      }
    );
    queryClient.setQueryData(colKey(target), (old: Cached | undefined) =>
      old && {
        ...old,
        data: [{ ...task, status: target }, ...old.data],
        meta: old.meta && { ...old.meta, total: old.meta.total + 1 },
      }
    );
    moveMutation.mutate({ id: taskId, status: target });
    toast.success(`${taskCode(task.number)} → ${TASK_STATUS_META[target].label}`);
  }

  return (
    <div className="flex h-[calc(100svh-10.5rem)] min-h-[460px] flex-col gap-5">
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
              <SelectTrigger className="w-40 bg-card">
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

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {/* below xl the board scrolls horizontally (slim bar); at xl+ all
            five columns fit and no horizontal scrollbar exists */}
        <div className="scrollbar-slim min-h-0 flex-1 overflow-x-auto xl:overflow-x-visible">
          <div className="flex h-full min-w-max gap-3 pb-1 xl:min-w-0">
            {COLUMNS.map((status) => (
              <Column
                key={status}
                status={status}
                data={columns[status]}
                canDrag={canUpdate}
                loadingMore={results[COLUMNS.indexOf(status)].isFetching}
                onLoadMore={() =>
                  setLimits((prev) => ({
                    ...prev,
                    [status]: prev[status] + PAGE,
                  }))
                }
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} dragging />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bug,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { TaskStatus } from "@odigma/shared";
import { api } from "@/lib/fetcher";
import {
  formatDate,
  initials,
  TASK_PRIORITY_META,
  TASK_STATUS_META,
  taskCode,
} from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TaskFormDialog, type TaskRow } from "./task-form-dialog";

export function TasksView({
  canCreate,
  canUpdate,
  canDelete,
  canAssign,
  isPortal,
}: {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canAssign: boolean;
  isPortal: boolean;
}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [deleting, setDeleting] = useState<TaskRow | null>(null);

  const clientsQuery = useQuery({
    queryKey: ["clients", "options"],
    queryFn: () =>
      api<{ id: string; name: string }[]>(
        "/api/v1/clients?pageSize=100&status=ACTIVE"
      ),
    enabled: !isPortal,
  });

  const query = useQuery({
    queryKey: ["tasks", { page, search, status, priority, type, clientFilter }],
    queryFn: () =>
      api<TaskRow[]>(
        `/api/v1/tasks?page=${page}&pageSize=20` +
          (search ? `&q=${encodeURIComponent(search)}` : "") +
          (status !== "ALL" ? `&status=${status}` : "") +
          (priority !== "ALL" ? `&priority=${priority}` : "") +
          (type !== "ALL" ? `&type=${type}` : "") +
          (clientFilter !== "ALL" ? `&clientId=${clientFilter}` : "")
      ),
    placeholderData: keepPreviousData,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      api(`/api/v1/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_, { status }) => {
      toast.success(`Status → ${TASK_STATUS_META[status].label}`);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/v1/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Task deleted.");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDeleting(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;
  const hasFilters =
    !!search || status !== "ALL" || priority !== "ALL" || type !== "ALL" || clientFilter !== "ALL";

  function applySearch() {
    setPage(1);
    setSearch(q.trim());
  }

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {meta ? `${meta.total} total` : "…"}
          </p>
        </div>
        {canCreate && (
          <Button
            className="ml-auto rounded-full shadow-[0_4px_18px_-4px_var(--primary-glow)]"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus /> New Task
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative w-full max-w-60">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onBlur={applySearch}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            placeholder="Search or ODG number…"
            className="pl-9"
          />
        </div>
        {!isPortal && (
          <Select
            value={clientFilter}
            onValueChange={(v) => {
              setPage(1);
              setClientFilter(v);
            }}
          >
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
        <Select
          value={status}
          onValueChange={(v) => {
            setPage(1);
            setStatus(v);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {Object.entries(TASK_STATUS_META).map(([value, meta]) => (
              <SelectItem key={value} value={value}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={priority}
          onValueChange={(v) => {
            setPage(1);
            setPriority(v);
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All priorities</SelectItem>
            {Object.entries(TASK_PRIORITY_META).map(([value, meta]) => (
              <SelectItem key={value} value={value}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={type}
          onValueChange={(v) => {
            setPage(1);
            setType(v);
          }}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            <SelectItem value="TASK">Tasks</SelectItem>
            <SelectItem value="BUG">Bugs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {query.isLoading ? (
          <div className="grid gap-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="grid justify-items-center gap-3 px-6 py-14 text-center">
            <div className="rounded-2xl bg-primary/10 p-3">
              <CheckSquare className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {hasFilters ? "No tasks match your filters" : "No tasks yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {hasFilters
                  ? "Try different filters."
                  : "Create the first task and it will show up here."}
              </p>
            </div>
            {canCreate && !hasFilters && (
              <Button
                className="rounded-full"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus /> Create Task
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Due</TableHead>
                  {(canUpdate || canDelete) && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((task) => {
                  const overdue =
                    task.dueDate &&
                    task.status !== "DONE" &&
                    task.dueDate.slice(0, 10) < today;
                  const dueToday =
                    task.dueDate &&
                    task.status !== "DONE" &&
                    task.dueDate.slice(0, 10) === today;
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          {task.type === "BUG" && (
                            <Bug className="size-3.5 text-status-blocked" />
                          )}
                          {taskCode(task.number)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/tasks/${task.id}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {task.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {task.client.name}
                          {task.project && ` · ${task.project.name}`}
                        </p>
                      </TableCell>
                      <TableCell>
                        {canUpdate ? (
                          <Select
                            value={task.status}
                            onValueChange={(v) =>
                              statusMutation.mutate({
                                id: task.id,
                                status: v as TaskStatus,
                              })
                            }
                          >
                            <SelectTrigger
                              size="sm"
                              className={`w-fit gap-1.5 rounded-full border-0 px-2.5 text-xs font-semibold ${TASK_STATUS_META[task.status].badge}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(TASK_STATUS_META).map(
                                ([value, meta]) => (
                                  <SelectItem key={value} value={value}>
                                    {meta.label}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            className={`rounded-full border-0 ${TASK_STATUS_META[task.status].badge}`}
                          >
                            {TASK_STATUS_META[task.status].label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`rounded-full border-0 ${TASK_PRIORITY_META[task.priority].badge}`}
                        >
                          {TASK_PRIORITY_META[task.priority].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.assignedTo ? (
                          <span className="inline-flex items-center gap-2 text-sm">
                            <Avatar className="size-6">
                              <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                                {initials(task.assignedTo.name)}
                              </AvatarFallback>
                            </Avatar>
                            {task.assignedTo.name.split(" ")[0]}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-sm tabular-nums ${
                          overdue
                            ? "font-semibold text-status-blocked"
                            : dueToday
                              ? "font-semibold text-priority-high"
                              : "text-muted-foreground"
                        }`}
                      >
                        {dueToday ? "Today" : formatDate(task.dueDate)}
                      </TableCell>
                      {(canUpdate || canDelete) && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Task actions"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canUpdate && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditing(task);
                                    setFormOpen(true);
                                  }}
                                >
                                  <Pencil /> Edit
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeleting(task)}
                                >
                                  <Trash2 /> Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <p className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </p>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editing}
        canAssign={canAssign}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleting && taskCode(deleting.number)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” is hidden from lists but its comments and
              history stay in the database (soft delete).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ProjectFormDialog, type ProjectRow } from "./project-form-dialog";

const STATUS_BADGE: Record<string, string> = {
  PLANNED: "bg-status-todo/15 text-status-todo",
  ACTIVE: "bg-status-in-progress/15 text-status-in-progress",
  ON_HOLD: "bg-warning/15 text-warning",
  COMPLETED: "bg-status-done/15 text-status-done",
  ARCHIVED: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export function ProjectsView({
  canCreate,
  canUpdate,
  canDelete,
  isPortal,
  portalClientId,
}: {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  isPortal: boolean;
  portalClientId?: string | null;
}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [deleting, setDeleting] = useState<ProjectRow | null>(null);

  const clientsQuery = useQuery({
    queryKey: ["clients", "options"],
    queryFn: () =>
      api<{ id: string; name: string }[]>(
        "/api/v1/clients?pageSize=100&status=ACTIVE"
      ),
    enabled: !isPortal,
  });

  const query = useQuery({
    queryKey: ["projects", { page, search, status, clientFilter }],
    queryFn: () =>
      api<ProjectRow[]>(
        `/api/v1/projects?page=${page}&pageSize=20` +
          (search ? `&q=${encodeURIComponent(search)}` : "") +
          (status !== "ALL" ? `&status=${status}` : "") +
          (clientFilter !== "ALL" ? `&clientId=${clientFilter}` : "")
      ),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/v1/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Project deleted.");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeleting(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  function applySearch() {
    setPage(1);
    setSearch(q.trim());
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
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
            <Plus /> New Project
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onBlur={applySearch}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            placeholder="Search projects…"
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
            <SelectTrigger className="w-44">
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
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {query.isLoading ? (
          <div className="grid gap-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="grid justify-items-center gap-3 px-6 py-14 text-center">
            <div className="rounded-2xl bg-primary/10 p-3">
              <FolderKanban className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {search || status !== "ALL" || clientFilter !== "ALL"
                  ? "No projects match your filters"
                  : "No projects yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {search || status !== "ALL" || clientFilter !== "ALL"
                  ? "Try different filters."
                  : "Create a project to group a client's tasks."}
              </p>
            </div>
            {canCreate && !search && status === "ALL" && clientFilter === "ALL" && (
              <Button
                className="rounded-full"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus /> Create Project
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead className="text-right">Tasks</TableHead>
                  {(canUpdate || canDelete) && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <p className="font-medium">{project.name}</p>
                      {project.description && (
                        <p className="max-w-72 truncate text-xs text-muted-foreground">
                          {project.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {project.client.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`rounded-full border-0 ${STATUS_BADGE[project.status]}`}
                      >
                        {STATUS_LABEL[project.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {project.startDate
                        ? new Date(project.startDate).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short" }
                          )
                        : "—"}
                      {" → "}
                      {project.endDate
                        ? new Date(project.endDate).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short" }
                          )
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {project._count?.tasks ?? 0}
                    </TableCell>
                    {(canUpdate || canDelete) && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Project actions"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canUpdate && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditing(project);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil /> Edit
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleting(project)}
                              >
                                <Trash2 /> Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
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

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editing}
        lockedClientId={portalClientId}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The project is hidden from lists but its tasks and history stay
              in the database (soft delete).
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

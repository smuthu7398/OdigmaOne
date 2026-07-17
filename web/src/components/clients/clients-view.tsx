"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
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
import Link from "next/link";
import { type ClientRow } from "./client-form";

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-status-done/15 text-status-done",
  INACTIVE: "bg-status-todo/15 text-status-todo",
  ARCHIVED: "bg-muted text-muted-foreground",
};

export function ClientsView({
  canCreate,
  canUpdate,
  canDelete,
}: {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState(""); // debounced-ish: applied on Enter/blur
  const [status, setStatus] = useState<string>("ALL");
  const [deleting, setDeleting] = useState<ClientRow | null>(null);

  const query = useQuery({
    queryKey: ["clients", { page, search, status }],
    queryFn: () =>
      api<ClientRow[]>(
        `/api/v1/clients?page=${page}&pageSize=20` +
          (search ? `&q=${encodeURIComponent(search)}` : "") +
          (status !== "ALL" ? `&status=${status}` : "")
      ),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/v1/clients/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Client deleted.");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
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
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {meta ? `${meta.total} total` : "…"}
          </p>
        </div>
        {canCreate && (
          <Button
            asChild
            className="ml-auto rounded-full shadow-[0_4px_18px_-4px_var(--primary-glow)]"
          >
            <Link href="/clients/new">
              <Plus /> New Client
            </Link>
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
            placeholder="Search clients…"
            className="pl-9"
          />
        </div>
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
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
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
              <Users className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {search || status !== "ALL"
                  ? "No clients match your filters"
                  : "No clients yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {search || status !== "ALL"
                  ? "Try a different search or status."
                  : "Add your first client — projects and tasks hang off clients."}
              </p>
            </div>
            {canCreate && !search && status === "ALL" && (
              <Button asChild className="rounded-full">
                <Link href="/clients/new">
                  <Plus /> Create Client
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                  <TableHead className="text-right">Tasks</TableHead>
                  {(canUpdate || canDelete) && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <p className="font-medium">{client.name}</p>
                      {client.companyName && (
                        <p className="text-xs text-muted-foreground">
                          {client.companyName}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{client.email ?? "—"}</p>
                      {client.phone && (
                        <p className="text-xs text-muted-foreground">
                          {client.phone}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`rounded-full border-0 ${STATUS_BADGE[client.status]}`}
                      >
                        {client.status.charAt(0) +
                          client.status.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {client._count?.projects ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {client._count?.tasks ?? 0}
                    </TableCell>
                    {(canUpdate || canDelete) && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Client actions"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canUpdate && (
                              <DropdownMenuItem asChild>
                                <Link href={`/clients/${client.id}/edit`}>
                                  <Pencil /> Edit
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleting(client)}
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

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The client is hidden from all lists but their tasks and history
              stay in the database (soft delete). You can restore them later
              from the database if needed.
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

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
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/fetcher";
import { initials, relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import type { DocRow } from "./doc-form";

export function DocsView({
  canCreate,
  canDelete,
  isPortal,
}: {
  canCreate: boolean;
  canDelete: boolean;
  isPortal: boolean;
}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [deleting, setDeleting] = useState<DocRow | null>(null);

  const clientsQuery = useQuery({
    queryKey: ["clients", "options"],
    queryFn: () =>
      api<{ id: string; name: string }[]>(
        "/api/v1/clients?pageSize=100&status=ACTIVE"
      ),
    enabled: !isPortal,
  });

  const query = useQuery({
    queryKey: ["docs", page, search, clientFilter],
    queryFn: () =>
      api<DocRow[]>(
        `/api/v1/docs?page=${page}&pageSize=20` +
          (search ? `&q=${encodeURIComponent(search)}` : "") +
          (clientFilter !== "ALL" ? `&clientId=${clientFilter}` : "")
      ),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/v1/docs/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Document deleted.");
      queryClient.invalidateQueries({ queryKey: ["docs"] });
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
          <h1 className="text-2xl font-semibold tracking-tight">Docs</h1>
          <p className="text-sm text-muted-foreground">
            {isPortal
              ? "Guides your agency shared with you"
              : "Guides, SOPs and notes — internal or shared with clients"}
          </p>
        </div>
        {canCreate && (
          <Button
            asChild
            className="ml-auto rounded-full shadow-[0_4px_18px_-4px_var(--primary-glow)]"
          >
            <Link href="/docs/new">
              <Plus /> New Doc
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
            placeholder="Search docs…"
            className="pl-9 bg-card"
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
            <SelectTrigger className="w-44 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All docs</SelectItem>
              <SelectItem value="internal">Internal only</SelectItem>
              {(clientsQuery.data?.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {query.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="grid justify-items-center gap-3 py-14 text-center">
            <div className="rounded-2xl bg-primary/10 p-3">
              <BookOpen className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {search || clientFilter !== "ALL"
                  ? "No docs match your filters"
                  : "No docs yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isPortal
                  ? "Documents shared with you will appear here."
                  : "Write the first guide — onboarding steps, SOPs, credentials runbooks…"}
              </p>
            </div>
            {canCreate && !search && clientFilter === "ALL" && (
              <Button asChild className="rounded-full">
                <Link href="/docs/new">
                  <Plus /> Write a Doc
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((doc) => (
            <Card
              key={doc.id}
              className="group relative transition-shadow hover:shadow-md"
            >
              <CardContent className="grid gap-3">
                <div className="flex items-start gap-2">
                  <Link
                    href={`/docs/${doc.id}`}
                    className="min-w-0 flex-1 font-semibold leading-snug hover:text-primary"
                  >
                    {doc.title}
                  </Link>
                  {canDelete && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label="Doc actions"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleting(doc)}
                        >
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {doc.client ? (
                    <Badge className="rounded-full border-0 bg-primary/10 text-primary">
                      <Building2 className="size-3" />
                      {doc.client.name}
                    </Badge>
                  ) : (
                    <Badge className="rounded-full border-0 bg-muted text-muted-foreground">
                      <Lock className="size-3" />
                      Internal
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Avatar className="size-5">
                    <AvatarFallback className="bg-primary/15 text-[9px] font-semibold text-primary">
                      {initials(doc.createdBy.name)}
                    </AvatarFallback>
                  </Avatar>
                  {doc.createdBy.name.split(" ")[0]} · updated{" "}
                  {relativeTime(doc.updatedAt)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
            <AlertDialogTitle>Delete “{deleting?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The document is hidden from lists but stays in the database
              (soft delete).
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

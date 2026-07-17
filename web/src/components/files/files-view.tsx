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
  ChevronLeft,
  ChevronRight,
  FileText,
  ImageIcon,
  Search,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/fetcher";
import { relativeTime, taskCode } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FileRow = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploaderId: string;
  uploader: { id: string; name: string };
  task: { id: string; number: number; title: string } | null;
  client: { id: string; name: string } | null;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesView({
  canModerate,
  isPortal,
}: {
  /** admin-only (file:delete) */
  canModerate: boolean;
  isPortal: boolean;
}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("ALL"); // ALL | IMAGES

  const query = useQuery({
    queryKey: ["files", "manager", page, search],
    queryFn: () =>
      api<FileRow[]>(
        `/api/v1/files?page=${page}&pageSize=25` +
          (search ? `&q=${encodeURIComponent(search)}` : "")
      ),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/v1/files/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("File deleted.");
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const all = query.data?.data ?? [];
  const items =
    kind === "IMAGES" ? all.filter((f) => f.mimeType.startsWith("image/")) : all;
  const meta = query.data?.meta;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Files</h1>
          <p className="text-sm text-muted-foreground">
            {isPortal
              ? "Files shared on your tasks"
              : "Everything uploaded across tasks"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onBlur={() => {
              setPage(1);
              setSearch(q.trim());
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                setSearch(q.trim());
              }
            }}
            placeholder="Search file names…"
            className="pl-9"
          />
        </div>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All files</SelectItem>
            <SelectItem value="IMAGES">Screenshots & images</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="grid gap-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="grid justify-items-center gap-3 px-6 py-14 text-center">
              <div className="rounded-2xl bg-primary/10 p-3">
                <FileText className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">No files here yet</p>
                <p className="text-sm text-muted-foreground">
                  Upload files from any task&apos;s detail page — they all show
                  up here.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Task</TableHead>
                    {!isPortal && <TableHead>Client</TableHead>}
                    <TableHead>Uploaded by</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        <a
                          href={`/api/v1/files/${file.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 font-medium hover:text-primary hover:underline"
                        >
                          <span className="rounded-lg bg-primary/10 p-1.5">
                            {file.mimeType.startsWith("image/") ? (
                              <ImageIcon className="size-3.5 text-primary" />
                            ) : (
                              <FileText className="size-3.5 text-primary" />
                            )}
                          </span>
                          <span className="max-w-56 truncate">
                            {file.originalName}
                          </span>
                        </a>
                      </TableCell>
                      <TableCell>
                        {file.task ? (
                          <Link
                            href={`/tasks/${file.task.id}`}
                            className="font-mono text-xs text-muted-foreground hover:text-primary"
                          >
                            {taskCode(file.task.number)}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      {!isPortal && (
                        <TableCell className="text-sm">
                          {file.client?.name ?? "—"}
                        </TableCell>
                      )}
                      <TableCell className="text-sm">
                        {file.uploader.name}
                        <span className="block text-xs text-muted-foreground">
                          {relativeTime(file.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatSize(file.size)}
                      </TableCell>
                      <TableCell>
                        {canModerate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Delete file"
                            onClick={() => deleteMutation.mutate(file.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}

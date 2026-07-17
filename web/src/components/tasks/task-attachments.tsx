"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
  UploadCloud,
} from "lucide-react";
import { api } from "@/lib/fetcher";
import { uploadWithProgress } from "@/lib/upload";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type AttachmentRow = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploaderId: string;
  uploader: { id: string; name: string };
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskAttachments({
  taskId,
  canUpload,
  canDelete,
}: {
  taskId: string;
  canUpload: boolean;
  /** admin-only (file:delete) */
  canDelete: boolean;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  // dragenter/leave fire for children too — count to avoid flicker
  const dragDepth = useRef(0);
  // in-flight uploads with live progress
  const [uploads, setUploads] = useState<
    { key: string; name: string; size: number; progress: number; error?: string }[]
  >([]);

  const query = useQuery({
    queryKey: ["files", taskId],
    queryFn: () => api<AttachmentRow[]>(`/api/v1/files?taskId=${taskId}`),
  });

  function startUpload(file: File) {
    const key = `${file.name}-${Date.now()}-${Math.random()}`;
    setUploads((u) => [
      ...u,
      { key, name: file.name, size: file.size, progress: 0 },
    ]);
    uploadWithProgress(file, { taskId }, (percent) =>
      setUploads((u) =>
        u.map((item) => (item.key === key ? { ...item, progress: percent } : item))
      )
    )
      .then(() => {
        setUploads((u) => u.filter((item) => item.key !== key));
        toast.success("File uploaded.", { description: file.name });
        queryClient.invalidateQueries({ queryKey: ["files", taskId] });
      })
      .catch((err: Error) => {
        setUploads((u) =>
          u.map((item) =>
            item.key === key ? { ...item, error: err.message } : item
          )
        );
        toast.error(`${file.name}: ${err.message}`);
        setTimeout(
          () => setUploads((u) => u.filter((item) => item.key !== key)),
          5000
        );
      });
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/v1/files/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("File deleted.");
      queryClient.invalidateQueries({ queryKey: ["files", taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function uploadAll(files: FileList | File[]) {
    Array.from(files).forEach(startUpload);
  }

  const files = query.data?.data ?? [];

  return (
    <Card
      className={cn(
        "relative transition-shadow",
        dragging && "ring-2 ring-primary/60"
      )}
      onDragEnter={(e) => {
        if (!canUpload) return;
        e.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => canUpload && e.preventDefault()}
      onDragLeave={() => {
        if (!canUpload) return;
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) {
          dragDepth.current = 0;
          setDragging(false);
        }
      }}
      onDrop={(e) => {
        if (!canUpload) return;
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        if (e.dataTransfer.files.length > 0) uploadAll(e.dataTransfer.files);
      }}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-primary/5 backdrop-blur-[1px]">
          <span className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg">
            <UploadCloud className="size-4" />
            Drop files to attach
          </span>
        </div>
      )}

      <CardHeader className="flex-row items-center">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Attachments ({files.length})
        </CardTitle>
        {canUpload && (
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) uploadAll(e.target.files);
              e.target.value = "";
            }}
          />
        )}
      </CardHeader>
      <CardContent className="grid gap-2">
        {uploads.length > 0 && (
          <ul className="grid gap-2">
            {uploads.map((upload) => (
              <li
                key={upload.key}
                className={cn(
                  "grid gap-1.5 rounded-lg border px-3 py-2.5",
                  upload.error && "border-destructive/40 bg-destructive/5"
                )}
              >
                <div className="flex items-center gap-2 text-sm">
                  {upload.error ? (
                    <span className="font-medium text-destructive">
                      Failed — {upload.name}
                    </span>
                  ) : (
                    <>
                      <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {upload.name}
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
                        {upload.progress < 100
                          ? `${upload.progress}%`
                          : "Processing…"}
                      </span>
                    </>
                  )}
                </div>
                {!upload.error && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-200"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
                {upload.error && (
                  <p className="text-xs text-destructive">{upload.error}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {query.isLoading ? (
          <Skeleton className="h-12" />
        ) : files.length === 0 && uploads.length === 0 ? (
          canUpload ? (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="grid w-full justify-items-center gap-2 rounded-xl border border-dashed py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
              >
                <UploadCloud className="size-6 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Drag &amp; drop files here
                </span>
                <span className="text-xs text-muted-foreground">
                  or click to browse — any format, up to 25 MB each
                </span>
              </button>
              <Button
                variant="outline"
                className="w-full rounded-full"
                onClick={() => inputRef.current?.click()}
              >
                {uploads.length > 0 ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Upload />
                )}
                Upload
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No files yet — screenshots and documents attached to this task
              appear here.
            </p>
          )
        ) : (
          <>
          <ul className="grid gap-2">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-3 rounded-lg border px-3 py-2"
              >
                <span className="rounded-lg bg-primary/10 p-2">
                  {file.mimeType.startsWith("image/") ? (
                    <ImageIcon className="size-4 text-primary" />
                  ) : (
                    <FileText className="size-4 text-primary" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={`/api/v1/files/${file.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm font-medium hover:text-primary hover:underline"
                  >
                    {file.originalName}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(file.size)} · {file.uploader.name} ·{" "}
                    {relativeTime(file.createdAt)}
                  </p>
                </div>
                {canDelete && (
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
              </li>
            ))}
          </ul>
          {canUpload && (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/[0.03] hover:text-foreground"
              >
                <UploadCloud className="size-3.5" />
                <span>
                  <span className="font-medium">Drag &amp; drop</span> files
                  here, or click to browse
                </span>
              </button>
              <Button
                variant="outline"
                className="w-full rounded-full"
                onClick={() => inputRef.current?.click()}
              >
                {uploads.length > 0 ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Upload />
                )}
                Upload
              </Button>
            </>
          )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

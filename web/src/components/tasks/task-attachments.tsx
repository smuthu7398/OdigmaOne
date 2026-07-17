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
  currentUserId,
  canUpload,
  canModerate,
}: {
  taskId: string;
  currentUserId: string;
  canUpload: boolean;
  canModerate: boolean;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  // dragenter/leave fire for children too — count to avoid flicker
  const dragDepth = useRef(0);

  const query = useQuery({
    queryKey: ["files", taskId],
    queryFn: () => api<AttachmentRow[]>(`/api/v1/files?taskId=${taskId}`),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("taskId", taskId);
      return api("/api/v1/files", { method: "POST", body: formData });
    },
    onSuccess: (_, file) => {
      toast.success("File uploaded.", { description: file.name });
      queryClient.invalidateQueries({ queryKey: ["files", taskId] });
    },
    onError: (err: Error, file) =>
      toast.error(`${file.name}: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/v1/files/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("File deleted.");
      queryClient.invalidateQueries({ queryKey: ["files", taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function uploadAll(files: FileList | File[]) {
    Array.from(files).forEach((file) => uploadMutation.mutate(file));
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
          <>
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
            <Button
              variant="outline"
              size="sm"
              className="ml-auto rounded-full"
              disabled={uploadMutation.isPending}
              onClick={() => inputRef.current?.click()}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Upload />
              )}
              Upload
            </Button>
          </>
        )}
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <Skeleton className="h-12" />
        ) : files.length === 0 ? (
          canUpload ? (
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
          ) : (
            <p className="text-sm text-muted-foreground">
              No files yet — screenshots and documents attached to this task
              appear here.
            </p>
          )
        ) : (
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
                {(file.uploaderId === currentUserId || canModerate) && (
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
        )}
      </CardContent>
    </Card>
  );
}

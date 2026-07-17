"use client";

import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { api } from "@/lib/fetcher";
import { relativeTime } from "@/lib/format";
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
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/v1/files/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("File deleted.");
      queryClient.invalidateQueries({ queryKey: ["files", taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const files = query.data?.data ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Attachments ({files.length})
        </CardTitle>
        {canUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate(file);
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
          <p className="text-sm text-muted-foreground">
            No files yet — screenshots and documents attached to this task
            appear here.
          </p>
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

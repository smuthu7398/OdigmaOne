"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { SectionLabel } from "@/components/section-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DocRow = {
  id: string;
  title: string;
  content: string | null;
  clientId: string | null;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
};

const INTERNAL = "__internal__";

/** Shared doc form — the rich editor is the star here. */
export function DocForm({
  doc,
  onDone,
  onCancel,
}: {
  doc: DocRow | null; // null = create
  onDone: (doc: DocRow) => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = doc !== null;
  const [title, setTitle] = useState(doc?.title ?? "");
  const [content, setContent] = useState(doc?.content ?? "");
  const [clientId, setClientId] = useState<string | null>(
    doc?.clientId ?? null
  );
  const [titleError, setTitleError] = useState(false);

  const clientsQuery = useQuery({
    queryKey: ["clients", "options"],
    queryFn: () =>
      api<{ id: string; name: string }[]>(
        "/api/v1/clients?pageSize=100&status=ACTIVE"
      ),
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: title.trim(),
        content: content || undefined,
        clientId,
      };
      return isEdit
        ? api<DocRow>(`/api/v1/docs/${doc.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : api<DocRow>("/api/v1/docs", {
            method: "POST",
            body: JSON.stringify(payload),
          });
    },
    onSuccess: (result) => {
      toast.success(isEdit ? "Document updated." : "Document created.", {
        description: title.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ["docs"] });
      queryClient.invalidateQueries({ queryKey: ["doc"] });
      onDone(result.data);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function submit() {
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    setTitleError(false);
    mutation.mutate();
  }

  return (
    <div className="grid gap-4">
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_330px]">
        <Card>
          <CardContent className="grid gap-5">
            <div className="grid gap-1.5">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title — e.g. Website launch checklist"
                aria-invalid={titleError}
                className="w-full border-0 bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50"
              />
              <div
                className={cn(
                  "h-px w-full",
                  titleError ? "bg-destructive" : "bg-border"
                )}
              />
              {titleError && (
                <p className="text-sm text-destructive">Title is required</p>
              )}
            </div>

            <div className="grid gap-2">
              <SectionLabel>Content</SectionLabel>
              <RichTextEditor
                value={content}
                onChange={setContent}
                minHeight="min-h-96"
                placeholder="Write the guide… headings, lists, code blocks, links — paste screenshots right here"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-20">
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <SectionLabel>Visible to</SectionLabel>
              <Select
                value={clientId ?? INTERNAL}
                onValueChange={(v) => setClientId(v === INTERNAL ? null : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={INTERNAL}>
                    Internal — team only
                  </SelectItem>
                  {(clientsQuery.data?.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} (client can read)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Internal docs never appear in the client portal. Docs linked
                to a client are readable by that client&apos;s portal users.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          onClick={submit}
          disabled={mutation.isPending}
          className="rounded-full px-6 shadow-[0_4px_18px_-4px_var(--primary-glow)]"
        >
          {mutation.isPending && <Loader2 className="animate-spin" />}
          {isEdit ? "Save changes" : "Create document"}
        </Button>
      </div>
    </div>
  );
}

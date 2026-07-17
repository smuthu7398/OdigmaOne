"use client";

import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, MessageCircleHeart, Star } from "lucide-react";
import { api } from "@/lib/fetcher";
import { relativeTime, taskCode } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { decorateRichText } from "@/lib/richtext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FeedbackRow = {
  id: string;
  rating: number | null;
  message: string;
  createdAt: string;
  client: { id: string; name: string };
  task: { id: string; number: number; title: string } | null;
};

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i < value
              ? "fill-warning text-warning"
              : "text-muted-foreground/40"
          )}
        />
      ))}
    </span>
  );
}

export function FeedbackView({
  canSubmit,
  isPortal,
}: {
  canSubmit: boolean;
  isPortal: boolean;
}) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [clientId, setClientId] = useState("");
  const [composerKey, setComposerKey] = useState(0);

  const query = useQuery({
    queryKey: ["feedback"],
    queryFn: () => api<FeedbackRow[]>("/api/v1/feedback?pageSize=50"),
    placeholderData: keepPreviousData,
  });

  const clientsQuery = useQuery({
    queryKey: ["clients", "options"],
    queryFn: () =>
      api<{ id: string; name: string }[]>(
        "/api/v1/clients?pageSize=100&status=ACTIVE"
      ),
    enabled: canSubmit && !isPortal,
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      api("/api/v1/feedback", {
        method: "POST",
        body: JSON.stringify({
          message: message.trim(),
          ...(rating > 0 && { rating }),
          ...(clientId && { clientId }),
        }),
      }),
    onSuccess: () => {
      toast.success("Feedback sent. Thank you!");
      setMessage("");
      setRating(0);
      setComposerKey((k) => k + 1);
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const items = query.data?.data ?? [];

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
        <p className="text-sm text-muted-foreground">
          {isPortal
            ? "Tell us how the work is going"
            : "What clients are saying"}
        </p>
      </div>

      {canSubmit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Share feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (message.trim()) submitMutation.mutate();
              }}
            >
              {!isPortal && (
                <div className="grid gap-2">
                  <Label>On behalf of client</Label>
                  <Select value={clientId || undefined} onValueChange={setClientId}>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {(clientsQuery.data?.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-2">
                <Label>Rating (optional)</Label>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(i + 1 === rating ? 0 : i + 1)}
                      aria-label={`${i + 1} star${i ? "s" : ""}`}
                    >
                      <Star
                        className={cn(
                          "size-6 transition-colors",
                          i < rating
                            ? "fill-warning text-warning"
                            : "text-muted-foreground/40 hover:text-warning"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">Message *</Label>
                <RichTextEditor
                  key={composerKey}
                  value={message}
                  onChange={setMessage}
                  minHeight="min-h-24"
                  placeholder="What's working well? What should we improve? Paste screenshots right here"
                />
              </div>
              <Button
                type="submit"
                className="w-fit rounded-full"
                disabled={submitMutation.isPending || !message.trim()}
              >
                {submitMutation.isPending && (
                  <Loader2 className="animate-spin" />
                )}
                Send feedback
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="grid gap-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="grid justify-items-center gap-3 px-6 py-14 text-center">
              <div className="rounded-2xl bg-primary/10 p-3">
                <MessageCircleHeart className="size-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                No feedback yet.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((f) => (
                <li key={f.id} className="grid gap-1 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{f.client.name}</span>
                    {f.rating && <Stars value={f.rating} />}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {relativeTime(f.createdAt)}
                    </span>
                  </div>
                  {f.message.trimStart().startsWith("<") ? (
                    <div
                      className="rich-text text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: decorateRichText(f.message),
                      }}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed">{f.message}</p>
                  )}
                  {f.task && (
                    <p className="font-mono text-xs text-muted-foreground">
                      {taskCode(f.task.number)} — {f.task.title}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

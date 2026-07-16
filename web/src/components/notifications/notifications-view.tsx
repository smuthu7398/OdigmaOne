"use client";

import Link from "next/link";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { api } from "@/lib/fetcher";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const TYPE_ICON: Record<string, typeof Bell> = {
  task_assigned: UserRound,
  task_status: RefreshCw,
  comment_added: MessageSquare,
};

export function NotificationsView() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["notifications", page],
    queryFn: () =>
      api<{ items: NotificationRow[]; unread: number }>(
        `/api/v1/notifications?page=${page}&pageSize=25`
      ),
    placeholderData: keepPreviousData,
  });

  const markMutation = useMutation({
    mutationFn: (input: { ids?: string[]; all?: boolean }) =>
      api("/api/v1/notifications", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items = query.data?.data.items ?? [];
  const unread = query.data?.data.unread ?? 0;
  const meta = query.data?.meta;

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread` : "All caught up 🎉"}
          </p>
        </div>
        {unread > 0 && (
          <Button
            variant="outline"
            className="ml-auto rounded-full"
            onClick={() => markMutation.mutate({ all: true })}
          >
            <CheckCheck /> Mark all read
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="grid gap-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="grid justify-items-center gap-3 px-6 py-14 text-center">
              <div className="rounded-2xl bg-primary/10 p-3">
                <Bell className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">No notifications yet</p>
                <p className="text-sm text-muted-foreground">
                  Task assignments, status changes and comments will land here.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const Icon = TYPE_ICON[n.type] ?? Bell;
                const inner = (
                  <div
                    className={cn(
                      "flex gap-3 px-4 py-3 transition-colors",
                      n.link && "hover:bg-accent",
                      !n.readAt && "bg-primary/[0.04]"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 rounded-lg p-2",
                        n.readAt ? "bg-muted" : "bg-primary/10"
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4",
                          n.readAt ? "text-muted-foreground" : "text-primary"
                        )}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm",
                          !n.readAt && "font-semibold"
                        )}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="truncate text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {relativeTime(n.createdAt)}
                      </p>
                    </div>
                    {!n.readAt && (
                      <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() =>
                          !n.readAt && markMutation.mutate({ ids: [n.id] })
                        }
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        className="w-full text-left"
                        onClick={() =>
                          !n.readAt && markMutation.mutate({ ids: [n.id] })
                        }
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
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

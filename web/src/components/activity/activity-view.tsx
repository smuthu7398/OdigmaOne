"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  FolderKanban,
  History,
  MessageSquare,
  ShieldCheck,
  Users,
} from "lucide-react";
import { api } from "@/lib/fetcher";
import { initials, relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ActivityRow = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string } | null;
};

const ENTITY_ICON: Record<string, typeof History> = {
  client: Users,
  project: FolderKanban,
  task: CheckSquare,
  comment: MessageSquare,
  file: FileText,
  worklog: Clock,
  user: Users,
  role: ShieldCheck,
};

function describe(a: ActivityRow): string {
  const meta = a.meta ?? {};
  const name =
    (meta.name as string) ??
    (meta.title as string) ??
    (meta.number ? `ODG-${meta.number}` : "");
  switch (`${a.entityType}:${a.action}`) {
    case "task:status_changed":
      return `moved ODG-${meta.number} from ${String(meta.from).replace("_", " ").toLowerCase()} to ${String(meta.to).replace("_", " ").toLowerCase()}`;
    case "task:reopened":
      return `reopened ODG-${meta.number}`;
    case "comment:created":
      return `commented on ODG-${meta.taskNumber}`;
    case "file:uploaded":
      return `uploaded ${meta.name}`;
    case "worklog:created":
      return `logged ${meta.hours}h for ${meta.date}`;
    default:
      return `${a.action.replace("_", " ")} ${a.entityType}${name ? ` “${name}”` : ""}`;
  }
}

const TYPE_OPTIONS = [
  ["ALL", "All types"],
  ["task", "Tasks"],
  ["client", "Clients"],
  ["project", "Projects"],
  ["comment", "Comments"],
  ["file", "Files"],
  ["worklog", "Work logs"],
] as const;

export function ActivityView() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("ALL");

  const query = useQuery({
    queryKey: ["activity", page, entityType],
    queryFn: () =>
      api<ActivityRow[]>(
        `/api/v1/activity?page=${page}&pageSize=30` +
          (entityType !== "ALL" ? `&entityType=${entityType}` : "")
      ),
    placeholderData: keepPreviousData,
  });

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
          <p className="text-sm text-muted-foreground">
            Everything that happened, newest first
          </p>
        </div>
        <Select
          value={entityType}
          onValueChange={(v) => {
            setPage(1);
            setEntityType(v);
          }}
        >
          <SelectTrigger className="ml-auto w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="grid gap-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="grid justify-items-center gap-3 px-6 py-14 text-center">
              <div className="rounded-2xl bg-primary/10 p-3">
                <History className="size-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                No activity recorded yet.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((a) => {
                const Icon = ENTITY_ICON[a.entityType] ?? History;
                return (
                  <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                    <Avatar className="mt-0.5 size-7">
                      <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                        {a.actor ? initials(a.actor.name) : "⚙"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">
                          {a.actor?.name ?? "System"}
                        </span>{" "}
                        {describe(a)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {relativeTime(a.createdAt)}
                      </p>
                    </div>
                    <span className="mt-1 rounded-lg bg-muted p-1.5">
                      <Icon className="size-3.5 text-muted-foreground" />
                    </span>
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

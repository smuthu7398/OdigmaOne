"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  SendHorizonal,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/fetcher";
import { initials, taskCode } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SectionLabel } from "@/components/section-label";

type WorkLogRow = {
  id: string;
  workDate: string;
  description: string;
  hours: string;
  userId: string;
  user: { id: string; name: string };
  task: { id: string; number: number; title: string } | null;
  client: { id: string; name: string } | null;
};

type TaskOption = { id: string; number: number; title: string };

function todayIST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date()
  );
}

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function WorkLogView({
  canCreate,
  canSeeOthers,
  currentUserId,
}: {
  canCreate: boolean;
  canSeeOthers: boolean;
  currentUserId: string;
}) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayIST());
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const isToday = date === todayIST();

  const query = useQuery({
    queryKey: ["work-logs", date],
    queryFn: () =>
      api<{ items: WorkLogRow[]; totalHours: number }>(
        `/api/v1/work-logs?date=${date}&pageSize=100`
      ),
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks", "log-options"],
    queryFn: () =>
      api<TaskOption[]>("/api/v1/tasks?pageSize=10&sort=-createdAt"),
    enabled: canCreate,
  });

  const canSubmit =
    description.trim().length > 0 &&
    Number(hours) >= 0.25 &&
    Number(hours) <= 24;

  const createMutation = useMutation({
    mutationFn: () =>
      api("/api/v1/work-logs", {
        method: "POST",
        body: JSON.stringify({
          workDate: date,
          description: description.trim(),
          hours: Number(hours),
          ...(taskId ? { taskId } : {}),
        }),
      }),
    onSuccess: () => {
      toast.success("Work logged.");
      setDescription("");
      setHours("");
      setTaskId(null);
      queryClient.invalidateQueries({ queryKey: ["work-logs"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/v1/work-logs/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Entry deleted.");
      queryClient.invalidateQueries({ queryKey: ["work-logs"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const logs = query.data?.data.items ?? [];
  const totalHours = query.data?.data.totalHours ?? 0;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Work Log</h1>
          <p className="text-sm text-muted-foreground">
            {canSeeOthers ? "Team's daily updates" : "Your daily updates"}
          </p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-semibold text-primary tabular-nums">
          <Clock className="size-3.5" />
          {totalHours}h logged
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-card shadow-sm"
          onClick={() => setDate((d) => shiftDate(d, -1))}
          aria-label="Previous day"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Input
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="w-40 bg-card"
        />
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-card shadow-sm"
          onClick={() => setDate((d) => shiftDate(d, 1))}
          disabled={isToday}
          aria-label="Next day"
        >
          <ChevronRight className="size-4" />
        </Button>
        {!isToday && (
          <Button
            variant="ghost"
            className="rounded-full text-primary"
            onClick={() => setDate(todayIST())}
          >
            Today
          </Button>
        )}
      </div>

      {canCreate && (
        <Card>
          <CardContent className="grid gap-4">
            <SectionLabel>
              What did you work on {isToday ? "today" : "this day"}?
            </SectionLabel>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="min-h-20 border-0 bg-muted/40 p-4 shadow-none focus-visible:ring-1"
              placeholder="e.g. Finalized the launch-offer banner and shared for review"
            />
            <div className="grid gap-2">
              <SectionLabel>Link a task (optional)</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {(tasksQuery.data?.data ?? []).map((t) => {
                  const active = taskId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      title={t.title}
                      onClick={() => setTaskId(active ? null : t.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 font-mono text-xs font-semibold transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {taskCode(t.number)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Hours"
                className="w-28"
              />
              <Button
                className="rounded-full px-5 shadow-[0_4px_18px_-4px_var(--primary-glow)]"
                disabled={!canSubmit || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <SendHorizonal className="size-4" />
                )}
                Log it
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="grid gap-4">
          <SectionLabel>
            {isToday ? "Today's entries" : `Entries · ${date}`} ({logs.length})
          </SectionLabel>
          {query.isLoading ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="grid justify-items-center gap-3 py-8 text-center">
              <div className="rounded-2xl bg-primary/10 p-3">
                <Clock className="size-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                {isToday
                  ? "Nothing logged yet — what did you work on?"
                  : "No entries were made on this date."}
              </p>
            </div>
          ) : (
            <ul className="grid gap-2.5">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex gap-3 rounded-xl bg-muted/40 px-4 py-3"
                >
                  <Avatar className="mt-0.5 size-8">
                    <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                      {initials(log.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{log.user.name}</span>
                      {log.client && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {log.client.name}
                        </span>
                      )}
                      {log.task && (
                        <span className="font-mono text-xs text-muted-foreground">
                          {" "}
                          · {taskCode(log.task.number)}
                        </span>
                      )}
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {log.description}
                    </p>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="rounded-full bg-card px-2.5 py-0.5 text-xs font-semibold tabular-nums shadow-sm">
                      {Number(log.hours)}h
                    </span>
                    {log.userId === currentUserId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        aria-label="Delete entry"
                        onClick={() => deleteMutation.mutate(log.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

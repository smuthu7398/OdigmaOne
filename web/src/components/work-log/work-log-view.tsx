"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { z } from "zod";
import { createWorkLogSchema } from "@odigma/shared";
import { api } from "@/lib/fetcher";
import { initials, taskCode } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

type WorkLogFormValues = z.input<typeof createWorkLogSchema>;

const NONE = "__none__";

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
  const [formOpen, setFormOpen] = useState(false);
  const isToday = date === todayIST();

  const query = useQuery({
    queryKey: ["work-logs", date],
    queryFn: () =>
      api<{ items: WorkLogRow[]; totalHours: number }>(
        `/api/v1/work-logs?date=${date}&pageSize=100`
      ),
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks", "options"],
    queryFn: () =>
      api<{ id: string; number: number; title: string }[]>(
        "/api/v1/tasks?pageSize=100&sort=-createdAt"
      ),
    enabled: formOpen,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WorkLogFormValues>({
    resolver: standardSchemaResolver(createWorkLogSchema),
  });

  const createMutation = useMutation({
    mutationFn: (values: WorkLogFormValues) => {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== "" && v !== undefined)
      );
      return api("/api/v1/work-logs", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success("Work logged.");
      queryClient.invalidateQueries({ queryKey: ["work-logs"] });
      setFormOpen(false);
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
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Work Log</h1>
          <p className="text-sm text-muted-foreground">
            {canSeeOthers ? "Team's daily updates" : "Your daily updates"}
          </p>
        </div>
        {canCreate && (
          <Button
            className="ml-auto rounded-full shadow-[0_4px_18px_-4px_var(--primary-glow)]"
            onClick={() => {
              reset({ workDate: date, description: "", hours: undefined });
              setFormOpen(true);
            }}
          >
            <Plus /> Log Work
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => setDate((d) => shiftDate(d, -1))}
          aria-label="Previous day"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Input
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="w-40"
        />
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
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
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary tabular-nums">
          <Clock className="size-3.5" />
          {totalHours}h logged
        </span>
      </div>

      <Card>
        <CardContent>
          {query.isLoading ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="grid justify-items-center gap-3 py-10 text-center">
              <div className="rounded-2xl bg-primary/10 p-3">
                <Clock className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Nothing logged for this day</p>
                <p className="text-sm text-muted-foreground">
                  {isToday
                    ? "What did you work on? Log it before it slips away."
                    : "No entries were made on this date."}
                </p>
              </div>
              {canCreate && isToday && (
                <Button
                  className="rounded-full"
                  onClick={() => {
                    reset({ workDate: date, description: "" });
                    setFormOpen(true);
                  }}
                >
                  <Plus /> Log Work
                </Button>
              )}
            </div>
          ) : (
            <ul className="grid gap-3">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex gap-3 rounded-lg border px-4 py-3"
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
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold tabular-nums">
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Log work</DialogTitle>
            <DialogDescription>
              A short note on what you did — linked to a task if there is one.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((v) => createMutation.mutate(v))}
            className="grid gap-4"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="workDate">Date *</Label>
                <Input id="workDate" type="date" {...register("workDate")} />
                {errors.workDate && (
                  <p className="text-sm text-destructive">
                    {errors.workDate.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hours">Hours *</Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="24"
                  placeholder="e.g. 2.5"
                  aria-invalid={!!errors.hours}
                  {...register("hours")}
                />
                {errors.hours && (
                  <p className="text-sm text-destructive">
                    {errors.hours.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Task (optional)</Label>
              <Select
                value={watch("taskId") ?? NONE}
                onValueChange={(v) =>
                  setValue("taskId", v === NONE ? undefined : v)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No task</SelectItem>
                  {(tasksQuery.data?.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {taskCode(t.number)} — {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">What did you do? *</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="e.g. Fixed the webhook field mapping and redeployed to staging"
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-full"
              >
                {createMutation.isPending && (
                  <Loader2 className="animate-spin" />
                )}
                Log it
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

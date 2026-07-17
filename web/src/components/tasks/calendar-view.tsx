"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/fetcher";
import { TASK_STATUS_META, taskCode } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewSwitcher } from "./view-switcher";
import type { TaskRow } from "./task-form";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function todayIST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date()
  );
}

/** Build the month grid: 42 cells (6 weeks), Monday-first. */
function monthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const startOffset = (first.getUTCDay() + 6) % 7; // Mon=0
  const cells: { date: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(Date.UTC(year, month, 1 - startOffset + i));
    cells.push({
      date: d.toISOString().slice(0, 10),
      inMonth: d.getUTCMonth() === month,
    });
  }
  return cells;
}

export function CalendarView() {
  const today = todayIST();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)) - 1); // 0-based

  const cells = useMemo(() => monthGrid(year, month), [year, month]);
  const from = cells[0].date;
  const to = cells[41].date;

  const query = useQuery({
    queryKey: ["tasks", "calendar", from, to],
    queryFn: () =>
      api<TaskRow[]>(
        `/api/v1/tasks?pageSize=100&dueFrom=${from}&dueTo=${to}`
      ),
  });

  const byDay = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    for (const task of query.data?.data ?? []) {
      if (!task.dueDate) continue;
      const day = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
      }).format(new Date(task.dueDate));
      map.set(day, [...(map.get(day) ?? []), task]);
    }
    return map;
  }, [query.data]);

  function shiftMonth(delta: number) {
    const next = new Date(Date.UTC(year, month + delta, 1));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth());
  }

  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric", timeZone: "UTC" }
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">By due date</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ViewSwitcher />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="min-w-40 text-center font-semibold">{monthLabel}</p>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
        {(year !== Number(today.slice(0, 4)) ||
          month !== Number(today.slice(5, 7)) - 1) && (
          <Button
            variant="ghost"
            className="rounded-full text-primary"
            onClick={() => {
              setYear(Number(today.slice(0, 4)));
              setMonth(Number(today.slice(5, 7)) - 1);
            }}
          >
            Today
          </Button>
        )}
      </div>

      {query.isLoading ? (
        <Skeleton className="h-130 rounded-xl" />
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-3xl overflow-hidden rounded-xl border bg-card">
            <div className="grid grid-cols-7 border-b bg-muted/40">
              {WEEKDAYS.map((d) => (
                <p
                  key={d}
                  className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {d}
                </p>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((cell, i) => {
                const tasks = byDay.get(cell.date) ?? [];
                const isToday = cell.date === today;
                return (
                  <div
                    key={cell.date}
                    className={cn(
                      "min-h-24 border-b border-r p-1.5",
                      i % 7 === 6 && "border-r-0",
                      i >= 35 && "border-b-0",
                      !cell.inMonth && "bg-muted/30"
                    )}
                  >
                    <p
                      className={cn(
                        "mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                        isToday
                          ? "bg-primary font-bold text-primary-foreground"
                          : cell.inMonth
                            ? "text-foreground"
                            : "text-muted-foreground/50"
                      )}
                    >
                      {Number(cell.date.slice(8, 10))}
                    </p>
                    <div className="grid gap-1">
                      {tasks.slice(0, 3).map((task) => (
                        <Link
                          key={task.id}
                          href={`/tasks/${task.id}`}
                          title={`${taskCode(task.number)} — ${task.title}`}
                          className={cn(
                            "truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-tight transition-opacity hover:opacity-80",
                            TASK_STATUS_META[task.status].badge
                          )}
                        >
                          {task.title}
                        </Link>
                      ))}
                      {tasks.length > 3 && (
                        <p className="px-1.5 text-[10px] text-muted-foreground">
                          +{tasks.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

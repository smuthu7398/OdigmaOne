"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { api } from "@/lib/fetcher";
import { TASK_STATUS_META } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Summary = {
  tasksByStatus: { status: string; count: number }[];
  tasksByClient: { client: string; count: number }[];
  timesheet: {
    userId: string;
    name: string;
    total: number;
    days: Record<string, number>;
  }[];
};

const STATUS_COLOR: Record<string, string> = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  IN_REVIEW: "#a855f7",
  BLOCKED: "#ef4444",
  DONE: "#22c55e",
};

function monthStartIST() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  return `${today.slice(0, 8)}01`;
}

function todayIST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date()
  );
}

export function ReportsView() {
  const [from, setFrom] = useState(monthStartIST());
  const [to, setTo] = useState(todayIST());

  const query = useQuery({
    queryKey: ["reports", from, to],
    queryFn: () => api<Summary>(`/api/v1/reports/summary?from=${from}&to=${to}`),
  });

  const data = query.data?.data;

  const timesheetDays = useMemo(() => {
    if (!data) return [];
    const days = new Set<string>();
    data.timesheet.forEach((row) =>
      Object.keys(row.days).forEach((d) => days.add(d))
    );
    return [...days].sort();
  }, [data]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Task distribution and logged hours
          </p>
        </div>
        <div className="ml-auto flex items-end gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="from" className="text-xs">
              From
            </Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => e.target.value && setFrom(e.target.value)}
              className="w-38"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="to" className="text-xs">
              To
            </Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => e.target.value && setTo(e.target.value)}
              className="w-38"
            />
          </div>
        </div>
      </div>

      {query.isLoading || !data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tasks by status</CardTitle>
              </CardHeader>
              <CardContent>
                {data.tasksByStatus.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No tasks yet.
                  </p>
                ) : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="55%" height={220}>
                      <PieChart>
                        <Pie
                          data={data.tasksByStatus}
                          dataKey="count"
                          nameKey="status"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          strokeWidth={0}
                        >
                          {data.tasksByStatus.map((entry) => (
                            <Cell
                              key={entry.status}
                              fill={STATUS_COLOR[entry.status]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [
                            value,
                            TASK_STATUS_META[String(name)]?.label ?? name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <ul className="grid gap-2 text-sm">
                      {data.tasksByStatus.map((s) => (
                        <li key={s.status} className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ background: STATUS_COLOR[s.status] }}
                          />
                          {TASK_STATUS_META[s.status].label}
                          <span className="ml-auto pl-4 font-semibold tabular-nums">
                            {s.count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tasks per client</CardTitle>
              </CardHeader>
              <CardContent>
                {data.tasksByClient.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No tasks yet.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.tasksByClient} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="client"
                        width={110}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip cursor={{ fill: "transparent" }} />
                      <Bar
                        dataKey="count"
                        fill="#f26222"
                        radius={[0, 6, 6, 0]}
                        barSize={18}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Timesheet{" "}
                <span className="font-normal text-muted-foreground">
                  ({from} → {to}, from daily work logs)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.timesheet.length === 0 ? (
                <div className="grid justify-items-center gap-3 py-10 text-center">
                  <div className="rounded-2xl bg-primary/10 p-3">
                    <BarChart3 className="size-5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No hours logged in this period yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-36">Person</TableHead>
                        {timesheetDays.map((d) => (
                          <TableHead
                            key={d}
                            className="text-right tabular-nums"
                          >
                            {new Date(`${d}T00:00:00Z`).toLocaleDateString(
                              "en-IN",
                              { day: "numeric", month: "short" }
                            )}
                          </TableHead>
                        ))}
                        <TableHead className="text-right font-semibold">
                          Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.timesheet.map((row) => (
                        <TableRow key={row.userId}>
                          <TableCell className="font-medium">
                            {row.name}
                          </TableCell>
                          {timesheetDays.map((d) => (
                            <TableCell
                              key={d}
                              className="text-right tabular-nums"
                            >
                              {row.days[d] ? `${row.days[d]}h` : "·"}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-semibold tabular-nums">
                            {row.total}h
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

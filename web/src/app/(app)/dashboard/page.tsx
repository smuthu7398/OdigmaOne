import { Suspense } from "react";
import {
  CheckSquare,
  CalendarClock,
  Users,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser, clientScope } from "@/lib/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Dashboard · Odigma One" };

function greeting() {
  const hourIST = Number(
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
  if (hourIST < 12) return "Good morning";
  if (hourIST < 17) return "Good afternoon";
  return "Good evening";
}

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        <div className="rounded-xl bg-primary/10 p-2.5">
          <Icon className="size-4.5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

async function Stats() {
  const user = (await getSessionUser())!;
  const scope = clientScope(user);

  // "today" in IST
  const now = new Date();
  const istDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(now); // YYYY-MM-DD
  const dayStart = new Date(`${istDate}T00:00:00+05:30`);
  const dayEnd = new Date(`${istDate}T23:59:59.999+05:30`);
  const weekStart = new Date(dayStart);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday

  const [activeTasks, dueToday, activeClients, weekHours] = await Promise.all([
    prisma.task.count({
      where: { ...scope, deletedAt: null, status: { notIn: ["DONE"] } },
    }),
    prisma.task.count({
      where: {
        ...scope,
        deletedAt: null,
        status: { notIn: ["DONE"] },
        dueDate: { gte: dayStart, lte: dayEnd },
      },
    }),
    prisma.client.count({
      where: user.clientId
        ? { id: user.clientId, deletedAt: null }
        : { deletedAt: null, status: "ACTIVE" },
    }),
    prisma.workLog.aggregate({
      _sum: { hours: true },
      where: {
        ...(user.clientId ? { clientId: user.clientId } : {}),
        workDate: { gte: weekStart, lte: dayEnd },
      },
    }),
  ]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Active Tasks" value={String(activeTasks)} icon={CheckSquare} />
      <StatCard label="Due Today" value={String(dueToday)} icon={CalendarClock} />
      <StatCard
        label={user.clientId ? "Your Account" : "Active Clients"}
        value={String(activeClients)}
        icon={Users}
      />
      <StatCard
        label="Hours This Week"
        value={`${Number(weekHours._sum.hours ?? 0)}h`}
        icon={Clock}
        hint="from daily work logs"
      />
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const user = (await getSessionUser())!;
  const firstName = user.name.split(" ")[0];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}, {firstName} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(new Date())}
        </p>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>

      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Recent tasks and today&apos;s work log will appear here as the
            Tasks and Work Log modules land.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

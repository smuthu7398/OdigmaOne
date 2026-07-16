"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Columns3, List } from "lucide-react";
import { cn } from "@/lib/utils";

const VIEWS = [
  { href: "/tasks", label: "List", icon: List },
  { href: "/tasks/board", label: "Board", icon: Columns3 },
  { href: "/tasks/calendar", label: "Calendar", icon: CalendarDays },
];

export function ViewSwitcher() {
  const pathname = usePathname();
  return (
    <div className="flex rounded-full border bg-card p-0.5">
      {VIEWS.map((view) => {
        const active = pathname === view.href;
        return (
          <Link
            key={view.href}
            href={view.href}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-[0_2px_10px_-2px_var(--primary-glow)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <view.icon className="size-3.5" />
            {view.label}
          </Link>
        );
      })}
    </div>
  );
}

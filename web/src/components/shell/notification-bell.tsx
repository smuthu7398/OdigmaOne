"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { api } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";

export function NotificationBell({ enabled }: { enabled: boolean }) {
  const query = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () =>
      api<{ items: unknown[]; unread: number }>(
        "/api/v1/notifications?pageSize=1"
      ),
    refetchInterval: 30_000, // poll — real-time channel can replace this later
    enabled,
  });

  const unread = query.data?.data.unread ?? 0;

  if (!enabled) return null;

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
    >
      <Link href="/notifications">
        <Bell className="size-4.5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
    </Button>
  );
}

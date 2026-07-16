"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "./nav";

export function SidebarNav({
  permissions,
  onNavigate,
}: {
  permissions: string[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const allowed = new Set(permissions);

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <Link href="/dashboard" onClick={onNavigate}>
          <Image
            src="/odigma-logo.png"
            alt="Odigma"
            width={104}
            height={36}
            priority
          />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter(
            (item) => !item.permission || allowed.has(item.permission)
          );
          if (items.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                {group.label}
              </p>
              <div className="grid gap-0.5">
                {items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-foreground before:absolute before:-left-3 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <item.icon
                        className={cn("size-4", active && "text-primary")}
                      />
                      {item.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

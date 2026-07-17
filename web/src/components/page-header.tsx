"use client";

// The app-wide sub-page header: breadcrumb row (back button + path +
// actions), bold title with optional pill, context chips or subtitle.

import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BackButton } from "@/components/back-button";

export type Crumb = { label: string; href?: string; mono?: boolean };

export function HeaderChip({
  icon: Icon,
  children,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  );
}

export function PageHeader({
  backHref,
  backLabel = "Back",
  crumbs,
  title,
  titleBadge,
  subtitle,
  chips,
  actions,
}: {
  backHref: string;
  backLabel?: string;
  crumbs: Crumb[];
  title: string;
  /** pill rendered beside the title (e.g. Task/Bug) */
  titleBadge?: React.ReactNode;
  subtitle?: string;
  /** chip row under the title (client, project, …) */
  chips?: React.ReactNode;
  /** right side of the breadcrumb row (e.g. Edit button) */
  actions?: React.ReactNode;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3">
        <BackButton href={backHref} label={backLabel} />
        <nav className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && (
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
              )}
              {crumb.href ? (
                <Link href={crumb.href} className="truncate hover:text-primary">
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "truncate",
                    i === crumbs.length - 1 &&
                      "font-semibold text-foreground",
                    crumb.mono && "font-mono text-xs"
                  )}
                >
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
        {actions && (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="min-w-0 text-3xl font-bold tracking-tight">
            {title}
          </h1>
          {titleBadge}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
        {chips && (
          <div className="flex flex-wrap items-center gap-2">{chips}</div>
        )}
      </div>
    </div>
  );
}

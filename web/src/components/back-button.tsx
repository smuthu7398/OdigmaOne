"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Circular back button used in every page header. */
export function BackButton({
  href,
  label = "Back",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Button
      asChild
      variant="outline"
      size="icon"
      aria-label={label}
      className="size-9 shrink-0 rounded-full bg-card shadow-sm transition-colors hover:border-primary/50 hover:text-primary"
    >
      <Link href={href}>
        <ArrowLeft className="size-4" />
      </Link>
    </Button>
  );
}

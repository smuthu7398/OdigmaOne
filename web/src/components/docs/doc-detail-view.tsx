"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Lock, Pencil } from "lucide-react";
import { api } from "@/lib/fetcher";
import { formatDate, initials } from "@/lib/format";
import { decorateRichText } from "@/lib/richtext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/page-header";
import type { DocRow } from "./doc-form";

export function DocDetailView({
  docId,
  canUpdate,
}: {
  docId: string;
  canUpdate: boolean;
}) {
  const docQuery = useQuery({
    queryKey: ["doc", docId],
    queryFn: () => api<DocRow>(`/api/v1/docs/${docId}`),
  });

  if (docQuery.isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-3xl gap-5">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-130 rounded-xl" />
      </div>
    );
  }

  const doc = docQuery.data?.data;
  if (!doc) {
    return (
      <div className="grid justify-items-center gap-3 py-20 text-center">
        <p className="font-medium">Document not found</p>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/docs">
            <ArrowLeft /> Back to docs
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <PageHeader
        backHref="/docs"
        backLabel="Back to docs"
        crumbs={[{ label: "Docs", href: "/docs" }, { label: doc.title }]}
        title={doc.title}
        titleBadge={
          doc.client ? (
            <Badge className="rounded-full border-0 bg-primary/10 text-primary">
              <Building2 className="size-3" />
              {doc.client.name}
            </Badge>
          ) : (
            <Badge className="rounded-full border-0 bg-muted text-muted-foreground">
              <Lock className="size-3" />
              Internal
            </Badge>
          )
        }
        actions={
          canUpdate ? (
            <Button
              asChild
              variant="outline"
              className="rounded-full bg-card shadow-sm"
            >
              <Link href={`/docs/${doc.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardContent>
          {doc.content ? (
            <div
              className="rich-text text-sm leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: decorateRichText(doc.content),
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              This document is empty.
            </p>
          )}
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Avatar className="size-5">
          <AvatarFallback className="bg-primary/15 text-[9px] font-semibold text-primary">
            {initials(doc.createdBy.name)}
          </AvatarFallback>
        </Avatar>
        Written by {doc.createdBy.name} · created {formatDate(doc.createdAt)} ·
        updated {formatDate(doc.updatedAt)}
      </p>
    </div>
  );
}

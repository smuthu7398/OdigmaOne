"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { DocForm, type DocRow } from "./doc-form";

export function EditDocView({ docId }: { docId: string }) {
  const router = useRouter();

  const docQuery = useQuery({
    queryKey: ["doc", docId],
    queryFn: () => api<DocRow>(`/api/v1/docs/${docId}`),
  });

  if (docQuery.isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-5">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
          <Skeleton className="h-130 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
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
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <PageHeader
        backHref={`/docs/${doc.id}`}
        backLabel="Back to doc"
        crumbs={[
          { label: "Docs", href: "/docs" },
          { label: doc.title, href: `/docs/${doc.id}` },
          { label: "Edit" },
        ]}
        title={`Edit “${doc.title}”`}
        subtitle={`${doc.client ? doc.client.name : "Internal"} · by ${doc.createdBy.name}`}
      />

      <DocForm
        doc={doc}
        onDone={() => router.push(`/docs/${doc.id}`)}
        onCancel={() => router.push(`/docs/${doc.id}`)}
      />
    </div>
  );
}

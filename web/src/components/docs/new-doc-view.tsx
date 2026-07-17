"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { DocForm } from "./doc-form";

export function NewDocView() {
  const router = useRouter();

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <PageHeader
        backHref="/docs"
        backLabel="Back to docs"
        crumbs={[{ label: "Docs", href: "/docs" }, { label: "New" }]}
        title="New doc"
        subtitle="Guides, SOPs, runbooks — internal or shared with a client."
      />

      <DocForm
        doc={null}
        onDone={(doc) => router.push(`/docs/${doc.id}`)}
        onCancel={() => router.push("/docs")}
      />
    </div>
  );
}

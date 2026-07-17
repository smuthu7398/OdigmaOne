"use client";

import { useRouter } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { DocForm } from "./doc-form";

export function NewDocView() {
  const router = useRouter();

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <div className="flex items-center gap-4">
        <BackButton href="/docs" label="Back to docs" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New doc</h1>
          <p className="text-sm text-muted-foreground">
            Guides, SOPs, runbooks — internal or shared with a client.
          </p>
        </div>
      </div>

      <DocForm
        doc={null}
        onDone={(doc) => router.push(`/docs/${doc.id}`)}
        onCancel={() => router.push("/docs")}
      />
    </div>
  );
}

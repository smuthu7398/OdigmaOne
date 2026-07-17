"use client";

import { useRouter } from "next/navigation";
import { ProjectForm } from "./project-form";
import { PageHeader } from "@/components/page-header";

export function NewProjectView({
  lockedClientId,
}: {
  lockedClientId?: string | null;
}) {
  const router = useRouter();

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <PageHeader
        backHref="/projects"
        backLabel="Back to projects"
        crumbs={[{ label: "Projects", href: "/projects" }, { label: "New" }]}
        title="New project"
        subtitle="Projects group a client's tasks — e.g. “Website Redesign”."
      />

      <ProjectForm
            project={null}
            lockedClientId={lockedClientId}
            onDone={() => router.push("/projects")}
            onCancel={() => router.push("/projects")}
          />
    </div>
  );
}

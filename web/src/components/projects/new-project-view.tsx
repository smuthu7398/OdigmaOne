"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectForm } from "./project-form";
import { BackButton } from "@/components/back-button";

export function NewProjectView({
  lockedClientId,
}: {
  lockedClientId?: string | null;
}) {
  const router = useRouter();

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <div className="flex items-center gap-3">
        <BackButton href="/projects" label="Back to projects" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            New project
          </h1>
          <p className="text-sm text-muted-foreground">
            Projects group a client&apos;s tasks — e.g. “Website Redesign”.
          </p>
        </div>
      </div>

      <ProjectForm
            project={null}
            lockedClientId={lockedClientId}
            onDone={() => router.push("/projects")}
            onCancel={() => router.push("/projects")}
          />
    </div>
  );
}

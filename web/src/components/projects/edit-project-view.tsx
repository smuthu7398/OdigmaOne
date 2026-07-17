"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2 } from "lucide-react";
import { HeaderChip, PageHeader } from "@/components/page-header";
import { api } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectForm, type ProjectRow } from "./project-form";
import { BackButton } from "@/components/back-button";

export function EditProjectView({ projectId }: { projectId: string }) {
  const router = useRouter();

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api<ProjectRow>(`/api/v1/projects/${projectId}`),
  });

  if (projectQuery.isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-5">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const project = projectQuery.data?.data;
  if (!project) {
    return (
      <div className="grid justify-items-center gap-3 py-20 text-center">
        <p className="font-medium">Project not found</p>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/projects">
            <ArrowLeft /> Back to projects
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <PageHeader
        backHref="/projects"
        backLabel="Back to projects"
        crumbs={[
          { label: "Projects", href: "/projects" },
          { label: project.name },
          { label: "Edit" },
        ]}
        title={`Edit ${project.name}`}
        chips={<HeaderChip icon={Building2}>{project.client.name}</HeaderChip>}
      />

      <ProjectForm
            project={project}
            onDone={() => router.push("/projects")}
            onCancel={() => router.push("/projects")}
          />
    </div>
  );
}

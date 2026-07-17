"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
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
      <div className="flex items-center gap-3">
        <BackButton href="/projects" label="Back to projects" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit {project.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {project.client.name}
          </p>
        </div>
      </div>

      <ProjectForm
            project={project}
            onDone={() => router.push("/projects")}
            onCancel={() => router.push("/projects")}
          />
    </div>
  );
}

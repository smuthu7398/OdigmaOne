"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectForm } from "./project-form";

export function NewProjectView({
  lockedClientId,
}: {
  lockedClientId?: string | null;
}) {
  const router = useRouter();

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5">
      <div className="flex items-center gap-3">
        <Button
          asChild
          variant="ghost"
          size="icon"
          aria-label="Back to projects"
        >
          <Link href="/projects">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            New project
          </h1>
          <p className="text-sm text-muted-foreground">
            Projects group a client&apos;s tasks — e.g. “Website Redesign”.
          </p>
        </div>
      </div>

      <Card>
        <CardContent>
          <ProjectForm
            project={null}
            lockedClientId={lockedClientId}
            onDone={() => router.push("/projects")}
            onCancel={() => router.push("/projects")}
          />
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Loader2 } from "lucide-react";
import { z } from "zod";
import { createProjectSchema, type ProjectStatus } from "@odigma/shared";
import { api } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { SectionLabel } from "@/components/section-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ProjectRow = {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  client: { id: string; name: string };
  _count?: { tasks: number };
};

const projectFormSchema = createProjectSchema
  .omit({ startDate: true, endDate: true })
  .extend({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  });
type ProjectFormValues = z.input<typeof projectFormSchema>;

const STATUS_META: { value: ProjectStatus; label: string; badge: string }[] = [
  { value: "PLANNED", label: "Planned", badge: "bg-status-todo/15 text-status-todo" },
  { value: "ACTIVE", label: "Active", badge: "bg-status-in-progress/15 text-status-in-progress" },
  { value: "ON_HOLD", label: "On hold", badge: "bg-warning/15 text-warning" },
  { value: "COMPLETED", label: "Completed", badge: "bg-status-done/15 text-status-done" },
  { value: "ARCHIVED", label: "Archived", badge: "bg-muted text-muted-foreground" },
];

/** Shared project form — two-column like the task form. */
export function ProjectForm({
  project,
  lockedClientId,
  onDone,
  onCancel,
}: {
  project: ProjectRow | null; // null = create
  /** portal users: client is fixed to their own — no dropdown */
  lockedClientId?: string | null;
  onDone: (project: ProjectRow) => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = project !== null;

  const clientsQuery = useQuery({
    queryKey: ["clients", "options"],
    queryFn: () =>
      api<{ id: string; name: string }[]>(
        "/api/v1/clients?pageSize=100&status=ACTIVE"
      ),
    enabled: !lockedClientId && !isEdit,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: standardSchemaResolver(projectFormSchema),
    defaultValues: {
      clientId: project?.clientId ?? lockedClientId ?? "",
      name: project?.name ?? "",
      description: project?.description ?? undefined,
      status: project?.status ?? "ACTIVE",
      startDate: project?.startDate?.slice(0, 10) ?? undefined,
      endDate: project?.endDate?.slice(0, 10) ?? undefined,
    },
  });

  const status = watch("status");

  const mutation = useMutation({
    mutationFn: (values: ProjectFormValues) => {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== "" && v !== undefined)
      );
      return isEdit
        ? api<ProjectRow>(`/api/v1/projects/${project.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : api<ProjectRow>("/api/v1/projects", {
            method: "POST",
            body: JSON.stringify(payload),
          });
    },
    onSuccess: (result, values) => {
      toast.success(isEdit ? "Project updated." : "Project created.", {
        description: values.name,
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onDone(result.data);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <form
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      className="grid gap-4"
      noValidate
    >
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_330px]">
        {/* ——— the project itself ——— */}
        <Card>
          <CardContent className="grid gap-5">
            <div className="grid gap-1.5">
              <input
                placeholder="Project name — e.g. Website Redesign"
                aria-invalid={!!errors.name}
                className="w-full border-0 bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50"
                {...register("name")}
              />
              <div
                className={cn(
                  "h-px w-full",
                  errors.name ? "bg-destructive" : "bg-border"
                )}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <SectionLabel>Description</SectionLabel>
              <Textarea
                rows={6}
                className="min-h-36 resize-y border-0 bg-muted/40 p-4 shadow-none focus-visible:ring-1"
                placeholder="Scope, goals, deliverables…"
                {...register("description")}
              />
            </div>
          </CardContent>
        </Card>

        {/* ——— details ——— */}
        <Card className="lg:sticky lg:top-20">
          <CardContent className="grid gap-5">
            {!lockedClientId && !isEdit && (
              <div className="grid gap-2">
                <SectionLabel>Client *</SectionLabel>
                <Select
                  value={watch("clientId") || undefined}
                  onValueChange={(v) =>
                    setValue("clientId", v, { shouldValidate: true })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        clientsQuery.isLoading ? "Loading…" : "Select a client"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(clientsQuery.data?.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clientId && (
                  <p className="text-sm text-destructive">
                    {errors.clientId.message}
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <SectionLabel>Status</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_META.map((s) => {
                  const active = status === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setValue("status", s.value)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                        s.badge,
                        active
                          ? "ring-2 ring-current"
                          : "opacity-45 hover:opacity-100"
                      )}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <SectionLabel>
                  <CalendarDays className="mr-1 inline size-3" />
                  Start
                </SectionLabel>
                <Input type="date" {...register("startDate")} />
              </div>
              <div className="grid gap-2">
                <SectionLabel>
                  <CalendarDays className="mr-1 inline size-3" />
                  End
                </SectionLabel>
                <Input type="date" {...register("endDate")} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-full px-6 shadow-[0_4px_18px_-4px_var(--primary-glow)]"
        >
          {mutation.isPending && <Loader2 className="animate-spin" />}
          {isEdit ? "Save changes" : "Create project"}
        </Button>
      </div>
    </form>
  );
}

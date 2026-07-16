"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { createProjectSchema, type ProjectStatus } from "@odigma/shared";
import { api } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

// form uses the schema's input type; dates travel as YYYY-MM-DD strings
const projectFormSchema = createProjectSchema.omit({ startDate: true, endDate: true }).extend({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
type ProjectFormValues = z.input<typeof projectFormSchema>;

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "PLANNED", label: "Planned" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectRow | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = project !== null;

  const clientsQuery = useQuery({
    queryKey: ["clients", "options"],
    queryFn: () =>
      api<{ id: string; name: string }[]>(
        "/api/v1/clients?pageSize=100&status=ACTIVE"
      ),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: standardSchemaResolver(projectFormSchema),
    defaultValues: { status: "ACTIVE" },
  });

  useEffect(() => {
    if (open) {
      reset({
        clientId: project?.clientId ?? "",
        name: project?.name ?? "",
        description: project?.description ?? undefined,
        status: project?.status ?? "ACTIVE",
        startDate: project?.startDate?.slice(0, 10) ?? undefined,
        endDate: project?.endDate?.slice(0, 10) ?? undefined,
      });
    }
  }, [open, project, reset]);

  const mutation = useMutation({
    mutationFn: (values: ProjectFormValues) => {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== "" && v !== undefined)
      );
      return isEdit
        ? api(`/api/v1/projects/${project.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : api("/api/v1/projects", {
            method: "POST",
            body: JSON.stringify(payload),
          });
    },
    onSuccess: (_, values) => {
      toast.success(isEdit ? "Project updated." : "Project created.", {
        description: values.name,
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            Projects group a client&apos;s tasks — e.g. “Website Redesign”.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          className="grid gap-4"
          noValidate
        >
          <div className="grid gap-2">
            <Label htmlFor="clientId">Client *</Label>
            <Select
              value={watch("clientId") || undefined}
              onValueChange={(v) => setValue("clientId", v, { shouldValidate: true })}
              disabled={isEdit}
            >
              <SelectTrigger id="clientId" className="w-full">
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

          <div className="grid gap-2">
            <Label htmlFor="name">Project name *</Label>
            <Input
              id="name"
              placeholder="e.g. Website Redesign"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={watch("status")}
                onValueChange={(v) => setValue("status", v as ProjectStatus)}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-full"
            >
              {mutation.isPending && <Loader2 className="animate-spin" />}
              {isEdit ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

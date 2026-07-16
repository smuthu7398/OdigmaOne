"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { createClientSchema, type ClientStatus } from "@odigma/shared";

// form works with the schema's input type (status optional pre-default)
type ClientFormValues = z.input<typeof createClientSchema>;
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

export type ClientRow = {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  status: ClientStatus;
  notes: string | null;
  createdAt: string;
  _count?: { projects: number; tasks: number };
};

const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ARCHIVED", label: "Archived" },
];

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientRow | null; // null = create
}) {
  const queryClient = useQueryClient();
  const isEdit = client !== null;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: standardSchemaResolver(createClientSchema),
    defaultValues: { status: "ACTIVE" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: client?.name ?? "",
        companyName: client?.companyName ?? undefined,
        email: client?.email ?? undefined,
        phone: client?.phone ?? undefined,
        status: client?.status ?? "ACTIVE",
        notes: client?.notes ?? undefined,
      });
    }
  }, [open, client, reset]);

  const mutation = useMutation({
    mutationFn: (values: ClientFormValues) =>
      isEdit
        ? api(`/api/v1/clients/${client.id}`, {
            method: "PATCH",
            body: JSON.stringify(values),
          })
        : api("/api/v1/clients", {
            method: "POST",
            body: JSON.stringify(values),
          }),
    onSuccess: (_, values) => {
      toast.success(isEdit ? "Client updated." : "Client created.", {
        description: values.name,
      });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit client" : "New client"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the client's details."
              : "Add a client to start creating projects and tasks for them."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          className="grid gap-4"
          noValidate
        >
          <div className="grid gap-2">
            <Label htmlFor="name">Client name *</Label>
            <Input
              id="name"
              placeholder="e.g. Shriram Properties"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="companyName">Company</Label>
              <Input id="companyName" {...register("companyName")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={watch("status")}
                onValueChange={(v) => setValue("status", v as ClientStatus)}
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                aria-invalid={!!errors.email}
                {...register("email", {
                  setValueAs: (v) => (v === "" ? undefined : v),
                })}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
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
              {isEdit ? "Save changes" : "Create client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

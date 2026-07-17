"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { createClientSchema, type ClientStatus } from "@odigma/shared";
import { api } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
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
  accountManagerId: string | null;
  accountManager?: { id: string; name: string } | null;
  _count?: { projects: number; tasks: number };
};

type ClientFormValues = z.input<typeof createClientSchema>;

const NONE = "__none__";

const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ARCHIVED", label: "Archived" },
];

/** Shared client form — full page for create (/clients/new) and edit
 *  (/clients/:id/edit). Mount it fresh; it initializes from `client`. */
export function ClientForm({
  client,
  onDone,
  onCancel,
}: {
  client: ClientRow | null; // null = create
  onDone: (client: ClientRow) => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = client !== null;

  const usersQuery = useQuery({
    queryKey: ["users", "options"],
    queryFn: () => api<{ id: string; name: string }[]>("/api/v1/users"),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: standardSchemaResolver(createClientSchema),
    defaultValues: {
      name: client?.name ?? "",
      companyName: client?.companyName ?? undefined,
      email: client?.email ?? undefined,
      phone: client?.phone ?? undefined,
      status: client?.status ?? "ACTIVE",
      notes: client?.notes ?? undefined,
      accountManagerId: client?.accountManagerId ?? undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ClientFormValues) => {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== "" && v !== undefined)
      );
      return isEdit
        ? api<ClientRow>(`/api/v1/clients/${client.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : api<ClientRow>("/api/v1/clients", {
            method: "POST",
            body: JSON.stringify(payload),
          });
    },
    onSuccess: (result, values) => {
      toast.success(isEdit ? "Client updated." : "Client created.", {
        description: values.name,
      });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
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
      <div className="grid gap-2">
        <Label htmlFor="name">Client name *</Label>
        <Input
          id="name"
          placeholder="e.g. TVS Emerald"
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
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Account Manager</Label>
        <Select
          value={watch("accountManagerId") ?? NONE}
          onValueChange={(v) =>
            setValue("accountManagerId", v === NONE ? null : v)
          }
        >
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue placeholder="Who owns this client?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No account manager</SelectItem>
            {(usersQuery.data?.data ?? []).map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          The account manager is notified of every request this client files.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={3} {...register("notes")} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
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
          className="rounded-full shadow-[0_4px_18px_-4px_var(--primary-glow)]"
        >
          {mutation.isPending && <Loader2 className="animate-spin" />}
          {isEdit ? "Save changes" : "Create client"}
        </Button>
      </div>
    </form>
  );
}

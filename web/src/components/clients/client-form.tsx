"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AtSign, Loader2, Phone } from "lucide-react";
import { z } from "zod";
import { createClientSchema, type ClientStatus } from "@odigma/shared";
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

const STATUS_META: { value: ClientStatus; label: string; badge: string }[] = [
  { value: "ACTIVE", label: "Active", badge: "bg-status-done/15 text-status-done" },
  { value: "INACTIVE", label: "Inactive", badge: "bg-status-todo/15 text-status-todo" },
  { value: "ARCHIVED", label: "Archived", badge: "bg-muted text-muted-foreground" },
];

/** Shared client form — two-column like the task form. */
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

  const status = watch("status");

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
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_330px]">
        {/* ——— the client ——— */}
        <Card>
          <CardContent className="grid gap-5">
            <div className="grid gap-1.5">
              <input
                placeholder="Client name — e.g. TVS Emerald"
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
              <SectionLabel>Company</SectionLabel>
              <Input
                placeholder="Legal / full company name"
                {...register("companyName")}
              />
            </div>

            <div className="grid gap-2">
              <SectionLabel>Notes</SectionLabel>
              <Textarea
                rows={5}
                className="min-h-28 resize-y border-0 bg-muted/40 p-4 shadow-none focus-visible:ring-1"
                placeholder="Contract details, preferences, anything the team should know…"
                {...register("notes")}
              />
            </div>
          </CardContent>
        </Card>

        {/* ——— details ——— */}
        <Card className="lg:sticky lg:top-20">
          <CardContent className="grid gap-5">
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

            <div className="grid gap-2">
              <SectionLabel>
                <AtSign className="mr-1 inline size-3" />
                Email
              </SectionLabel>
              <Input
                type="email"
                placeholder="contact@company.com"
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
              <SectionLabel>
                <Phone className="mr-1 inline size-3" />
                Phone
              </SectionLabel>
              <Input placeholder="+91 …" {...register("phone")} />
            </div>

            <div className="grid gap-2">
              <SectionLabel>Account Manager</SectionLabel>
              <Select
                value={watch("accountManagerId") ?? NONE}
                onValueChange={(v) =>
                  setValue("accountManagerId", v === NONE ? null : v)
                }
              >
                <SelectTrigger className="w-full">
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
                Notified of every request this client files.
              </p>
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
          {isEdit ? "Save changes" : "Create client"}
        </Button>
      </div>
    </form>
  );
}

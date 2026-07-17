"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AtSign, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { z } from "zod";
import { api } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { SectionLabel } from "@/components/section-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const createUserFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Minimum 8 characters"),
  roleId: z.string().min(1, "Pick a role"),
  clientId: z.string().optional(),
});
type CreateUserForm = z.input<typeof createUserFormSchema>;

const NONE = "__none__";

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$";
  return Array.from(crypto.getRandomValues(new Uint32Array(12)))
    .map((n) => chars[n % chars.length])
    .join("");
}

export function NewUserView() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: () => api<{ id: string; name: string }[]>("/api/v1/roles"),
  });

  const clientsQuery = useQuery({
    queryKey: ["clients", "options"],
    queryFn: () =>
      api<{ id: string; name: string }[]>(
        "/api/v1/clients?pageSize=100&status=ACTIVE"
      ),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: standardSchemaResolver(createUserFormSchema),
    defaultValues: { password: generatePassword() },
  });

  const roleId = watch("roleId");

  const createMutation = useMutation({
    mutationFn: (values: CreateUserForm) => {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== "" && v !== undefined)
      );
      return api("/api/v1/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_, values) => {
      toast.success("User created.", {
        description: `${values.name} can sign in with the password you set.`,
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      router.push("/team");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const roles = rolesQuery.data?.data ?? [];

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <div className="flex items-center gap-4">
        <BackButton href="/team" label="Back to team" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New user</h1>
          <p className="text-sm text-muted-foreground">
            Self-signup is disabled — accounts are created here. Share the
            password securely; they can change it in Settings.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit((v) => createMutation.mutate(v))}
        className="grid gap-4"
        noValidate
      >
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_330px]">
          {/* ——— the person ——— */}
          <Card>
            <CardContent className="grid gap-5">
              <div className="grid gap-1.5">
                <input
                  placeholder="Full name — e.g. Priya Raman"
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
                <SectionLabel>
                  <AtSign className="mr-1 inline size-3" />
                  Email *
                </SectionLabel>
                <Input
                  type="email"
                  placeholder="name@odigma.ooo"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <SectionLabel>
                  <KeyRound className="mr-1 inline size-3" />
                  Temporary password *
                </SectionLabel>
                <div className="flex max-w-sm gap-2">
                  <Input className="font-mono" {...register("password")} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 rounded-full"
                    aria-label="Regenerate password"
                    onClick={() =>
                      setValue("password", generatePassword(), {
                        shouldValidate: true,
                      })
                    }
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ——— access ——— */}
          <Card className="lg:sticky lg:top-20">
            <CardContent className="grid gap-5">
              <div className="grid gap-2">
                <SectionLabel>Role *</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {rolesQuery.isLoading && (
                    <span className="text-xs text-muted-foreground">
                      Loading roles…
                    </span>
                  )}
                  {roles.map((r) => {
                    const active = roleId === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() =>
                          setValue("roleId", r.id, { shouldValidate: true })
                        }
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {r.name}
                      </button>
                    );
                  })}
                </div>
                {errors.roleId && (
                  <p className="text-sm text-destructive">
                    {errors.roleId.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <SectionLabel>Portal client (Client role only)</SectionLabel>
                <Select
                  value={watch("clientId") ?? NONE}
                  onValueChange={(v) =>
                    setValue("clientId", v === NONE ? undefined : v)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None (team member)</SelectItem>
                    {(clientsQuery.data?.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Linking a client turns this account into a portal login that
                  only sees that client&apos;s world.
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
            onClick={() => router.push("/team")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-full px-6 shadow-[0_4px_18px_-4px_var(--primary-glow)]"
          >
            {createMutation.isPending && <Loader2 className="animate-spin" />}
            Create user
          </Button>
        </div>
      </form>
    </div>
  );
}

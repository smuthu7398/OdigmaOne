"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { z } from "zod";
import { api } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BackButton } from "@/components/back-button";

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
    <div className="mx-auto grid w-full max-w-2xl gap-5">
      <div className="flex items-center gap-3">
        <BackButton href="/team" label="Back to team" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New user</h1>
          <p className="text-sm text-muted-foreground">
            Self-signup is disabled — accounts are created here. Share the
            password securely; they can change it in Settings.
          </p>
        </div>
      </div>

      <Card>
        <CardContent>
          <form
            onSubmit={handleSubmit((v) => createMutation.mutate(v))}
            className="grid gap-4"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" {...register("name")} />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Temporary password *</Label>
              <div className="flex max-w-sm gap-2">
                <Input id="password" {...register("password")} />
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Role *</Label>
                <Select
                  value={watch("roleId") || undefined}
                  onValueChange={(v) =>
                    setValue("roleId", v, { shouldValidate: true })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        rolesQuery.isLoading ? "Loading…" : "Pick a role"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.roleId && (
                  <p className="text-sm text-destructive">
                    {errors.roleId.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Portal client (Client role only)</Label>
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
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
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
                className="rounded-full shadow-[0_4px_18px_-4px_var(--primary-glow)]"
              >
                {createMutation.isPending && (
                  <Loader2 className="animate-spin" />
                )}
                Create user
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

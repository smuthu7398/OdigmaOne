"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, UserCog } from "lucide-react";
import { z } from "zod";
import { api } from "@/lib/fetcher";
import { formatDate, initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UserRow = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  roleId: string | null;
  role: { id: string; name: string } | null;
  client: { id: string; name: string } | null;
  _count: { tasksAssigned: number; workLogs: number };
};

type RoleOption = { id: string; name: string };

const createUserFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Minimum 8 characters"),
  roleId: z.string().min(1, "Pick a role"),
  clientId: z.string().optional(),
});
type CreateUserForm = z.input<typeof createUserFormSchema>;

function generatePassword() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$";
  return Array.from(crypto.getRandomValues(new Uint32Array(12)))
    .map((n) => chars[n % chars.length])
    .join("");
}

export function TeamView({
  currentUserId,
  canCreate,
  canUpdate,
}: {
  currentUserId: string;
  canCreate: boolean;
  canUpdate: boolean;
}) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["users", "full"],
    queryFn: () => api<UserRow[]>("/api/v1/users?full=1"),
  });

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: () => api<RoleOption[]>("/api/v1/roles"),
    enabled: canUpdate || canCreate,
  });

  const clientsQuery = useQuery({
    queryKey: ["clients", "options"],
    queryFn: () =>
      api<{ id: string; name: string }[]>(
        "/api/v1/clients?pageSize=100&status=ACTIVE"
      ),
    enabled: formOpen,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: standardSchemaResolver(createUserFormSchema),
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
      setFormOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      roleId?: string;
      isActive?: boolean;
    }) =>
      api(`/api/v1/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("User updated.");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const users = usersQuery.data?.data ?? [];
  const roles = rolesQuery.data?.data ?? [];
  const NONE = "__none__";

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">
            {users.length
              ? `${users.filter((u) => u.isActive).length} active member(s)`
              : "…"}
          </p>
        </div>
        {canCreate && (
          <Button
            className="ml-auto rounded-full shadow-[0_4px_18px_-4px_var(--primary-glow)]"
            onClick={() => {
              reset({
                name: "",
                email: "",
                password: generatePassword(),
                roleId: "",
              });
              setFormOpen(true);
            }}
          >
            <Plus /> New User
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {usersQuery.isLoading ? (
            <div className="grid gap-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Portal client</TableHead>
                    <TableHead className="text-right">Tasks</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow
                      key={u.id}
                      className={!u.isActive ? "opacity-50" : undefined}
                    >
                      <TableCell>
                        <span className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                              {initials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            <span className="block font-medium">
                              {u.name}
                              {u.id === currentUserId && (
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  (you)
                                </span>
                              )}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {u.email}
                            </span>
                          </span>
                        </span>
                      </TableCell>
                      <TableCell>
                        {canUpdate && u.id !== currentUserId ? (
                          <Select
                            value={u.roleId ?? undefined}
                            onValueChange={(v) =>
                              updateMutation.mutate({ id: u.id, roleId: v })
                            }
                          >
                            <SelectTrigger size="sm" className="w-36">
                              <SelectValue placeholder="No role" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className="rounded-full border-0 bg-primary/10 text-primary">
                            {u.role?.name ?? "No role"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {u.client?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {u._count.tasksAssigned}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(u.createdAt)}
                      </TableCell>
                      <TableCell>
                        {canUpdate && u.id !== currentUserId ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() =>
                              updateMutation.mutate({
                                id: u.id,
                                isActive: !u.isActive,
                              })
                            }
                          >
                            {u.isActive ? "Deactivate" : "Reactivate"}
                          </Button>
                        ) : (
                          <Badge
                            className={
                              u.isActive
                                ? "rounded-full border-0 bg-status-done/15 text-status-done"
                                : "rounded-full border-0 bg-muted text-muted-foreground"
                            }
                          >
                            {u.isActive ? "Active" : "Inactive"}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New user</DialogTitle>
            <DialogDescription>
              Self-signup is disabled — accounts are created here. Share the
              password securely; they can change it in Settings.
            </DialogDescription>
          </DialogHeader>
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
              <div className="flex gap-2">
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
                    <SelectValue placeholder="Pick a role" />
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-full"
              >
                {createMutation.isPending && (
                  <Loader2 className="animate-spin" />
                )}
                Create user
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

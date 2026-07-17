"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { api } from "@/lib/fetcher";
import { formatDate, initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  _count: { taskAssignments: number; workLogs: number };
};

type RoleOption = { id: string; name: string };

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

  const usersQuery = useQuery({
    queryKey: ["users", "full"],
    queryFn: () => api<UserRow[]>("/api/v1/users?full=1"),
  });

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: () => api<RoleOption[]>("/api/v1/roles"),
    enabled: canUpdate,
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
            asChild
            className="ml-auto rounded-full shadow-[0_4px_18px_-4px_var(--primary-glow)]"
          >
            <Link href="/team/new">
              <Plus /> New User
            </Link>
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
                        {u._count.taskAssignments}
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
    </div>
  );
}

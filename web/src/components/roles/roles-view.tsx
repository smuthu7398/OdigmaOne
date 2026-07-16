"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Lock, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: string[];
};

type PermissionRow = { id: string; key: string; group: string };

export function RolesView({
  canCreate,
  canUpdate,
  canDelete,
}: {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [deleting, setDeleting] = useState<RoleRow | null>(null);

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: () => api<RoleRow[]>("/api/v1/roles"),
  });
  const permsQuery = useQuery({
    queryKey: ["permissions"],
    queryFn: () => api<PermissionRow[]>("/api/v1/permissions"),
  });

  const roles = rolesQuery.data?.data ?? [];
  const permissions = permsQuery.data?.data ?? [];
  const selected = roles.find((r) => r.id === selectedId) ?? roles[0] ?? null;
  const locked = !canUpdate || !selected || selected.name === "Super Admin";

  // load the selected role's permissions into the editable draft
  useEffect(() => {
    if (selected) {
      setDraft(new Set(selected.permissions));
      setDirty(false);
    }
  }, [selected?.id, rolesQuery.dataUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = [...new Set(permissions.map((p) => p.group))];

  const saveMutation = useMutation({
    mutationFn: () =>
      api(`/api/v1/roles/${selected!.id}`, {
        method: "PATCH",
        body: JSON.stringify({ permissions: [...draft] }),
      }),
    onSuccess: () => {
      toast.success(`Permissions saved for ${selected!.name}.`);
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api<{ id: string }>("/api/v1/roles", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
          permissions: [],
        }),
      }),
    onSuccess: (res) => {
      toast.success("Role created — now pick its permissions.");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setCreateOpen(false);
      setSelectedId(res.data.id);
      setNewName("");
      setNewDescription("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/v1/roles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Role deleted.");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setDeleting(null);
      setSelectedId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function toggle(key: string) {
    if (locked) return;
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setDirty(true);
  }

  function toggleGroup(group: string, keys: string[]) {
    if (locked) return;
    const allOn = keys.every((k) => draft.has(k));
    setDraft((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => (allOn ? next.delete(k) : next.add(k)));
      return next;
    });
    setDirty(true);
  }

  if (rolesQuery.isLoading || permsQuery.isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Roles &amp; Permissions
          </h1>
          <p className="text-sm text-muted-foreground">
            What each role can see and do — changes apply on next page load
          </p>
        </div>
        {canCreate && (
          <Button
            className="ml-auto rounded-full shadow-[0_4px_18px_-4px_var(--primary-glow)]"
            onClick={() => setCreateOpen(true)}
          >
            <Plus /> New Role
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit">
          <CardContent className="grid gap-1 p-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedId(role.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  selected?.id === role.id
                    ? "bg-primary/10 font-semibold text-primary"
                    : "hover:bg-accent"
                )}
              >
                {role.name === "Super Admin" ? (
                  <Lock className="size-3.5 shrink-0" />
                ) : (
                  <ShieldCheck className="size-3.5 shrink-0" />
                )}
                <span className="min-w-0 flex-1 truncate">{role.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {role.userCount}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        {selected && (
          <Card>
            <CardContent className="grid gap-5">
              <div className="flex flex-wrap items-start gap-2">
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    {selected.name}
                    {selected.isSystem && (
                      <Badge variant="outline" className="rounded-full text-xs">
                        System
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selected.description ?? "No description"} ·{" "}
                    {selected.userCount} user(s)
                  </p>
                </div>
                <div className="ml-auto flex gap-2">
                  {canDelete && !selected.isSystem && (
                    <Button
                      variant="outline"
                      className="rounded-full text-destructive"
                      onClick={() => setDeleting(selected)}
                    >
                      <Trash2 /> Delete
                    </Button>
                  )}
                  {!locked && (
                    <Button
                      className="rounded-full"
                      disabled={!dirty || saveMutation.isPending}
                      onClick={() => saveMutation.mutate()}
                    >
                      {saveMutation.isPending && (
                        <Loader2 className="animate-spin" />
                      )}
                      Save changes
                    </Button>
                  )}
                </div>
              </div>

              {selected.name === "Super Admin" && (
                <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Lock className="mr-1.5 inline size-3.5" />
                  Super Admin always has every permission and can&apos;t be
                  edited.
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {groups.map((group) => {
                  const keys = permissions
                    .filter((p) => p.group === group)
                    .map((p) => p.key);
                  const onCount = keys.filter((k) => draft.has(k)).length;
                  return (
                    <div
                      key={group}
                      className="rounded-xl border p-3"
                    >
                      <button
                        className="mb-2 flex w-full items-center text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                        onClick={() => toggleGroup(group, keys)}
                        disabled={locked}
                      >
                        {group}
                        <span className="ml-auto tabular-nums">
                          {onCount}/{keys.length}
                        </span>
                      </button>
                      <div className="grid gap-1.5">
                        {keys.map((key) => {
                          const action = key.split(":")[1];
                          const on = draft.has(key);
                          return (
                            <button
                              key={key}
                              onClick={() => toggle(key)}
                              disabled={locked}
                              className={cn(
                                "flex items-center gap-2 rounded-lg px-2 py-1 text-left text-sm transition-colors",
                                locked
                                  ? "cursor-default"
                                  : "hover:bg-accent",
                                on ? "text-foreground" : "text-muted-foreground"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex size-4 items-center justify-center rounded border text-[10px] font-bold",
                                  on
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border"
                                )}
                              >
                                {on ? "✓" : ""}
                              </span>
                              {action}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New role</DialogTitle>
            <DialogDescription>
              Create the role first, then tick its permissions.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) createMutation.mutate();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="roleName">Role name *</Label>
              <Input
                id="roleName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Designer"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="roleDescription">Description</Label>
              <Input
                id="roleDescription"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What this role is for"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-full"
                disabled={createMutation.isPending || !newName.trim()}
              >
                {createMutation.isPending && (
                  <Loader2 className="animate-spin" />
                )}
                Create role
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Roles with users still assigned can&apos;t be deleted — reassign
              those users first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

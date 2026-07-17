"use client";

// Edit-only wrapper — creation lives on its own page at /tasks/new.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskForm, type TaskRow } from "./task-form";

export type { TaskRow };

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  canAssign,
  lockedClientId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskRow | null;
  canAssign: boolean;
  lockedClientId?: string | null;
}) {
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit ODG-{task.number}</DialogTitle>
          <DialogDescription>Update the task&apos;s details.</DialogDescription>
        </DialogHeader>
        {open && (
          <TaskForm
            task={task}
            canAssign={canAssign}
            lockedClientId={lockedClientId}
            onDone={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

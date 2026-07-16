export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** "2 hours ago" style, IST-friendly. */
export function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  const diffSec = Math.round((then - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(Math.trunc(diffSec / 1), "second");
  if (abs < 3600) return rtf.format(Math.trunc(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.trunc(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.trunc(diffSec / 86400), "day");
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function taskCode(number: number) {
  return `ODG-${number}`;
}

export const TASK_STATUS_META: Record<
  string,
  { label: string; badge: string; dot: string }
> = {
  TODO: {
    label: "To Do",
    badge: "bg-status-todo/15 text-status-todo",
    dot: "bg-status-todo",
  },
  IN_PROGRESS: {
    label: "In Progress",
    badge: "bg-status-in-progress/15 text-status-in-progress",
    dot: "bg-status-in-progress",
  },
  IN_REVIEW: {
    label: "In Review",
    badge: "bg-status-in-review/15 text-status-in-review",
    dot: "bg-status-in-review",
  },
  BLOCKED: {
    label: "Blocked",
    badge: "bg-status-blocked/15 text-status-blocked",
    dot: "bg-status-blocked",
  },
  DONE: {
    label: "Done",
    badge: "bg-status-done/15 text-status-done",
    dot: "bg-status-done",
  },
};

export const TASK_PRIORITY_META: Record<string, { label: string; badge: string }> = {
  LOW: { label: "Low", badge: "bg-priority-low/15 text-priority-low" },
  MEDIUM: { label: "Medium", badge: "bg-priority-medium/15 text-priority-medium" },
  HIGH: { label: "High", badge: "bg-priority-high/15 text-priority-high" },
  URGENT: { label: "Urgent", badge: "bg-priority-urgent/15 text-priority-urgent" },
};

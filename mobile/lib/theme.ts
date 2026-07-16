// Odigma One design tokens — mobile mirror of web's globals.css.
// Spec: docs/UI_Design_Guide.md. Light theme (default); dark arrives later.

export const colors = {
  background: "#f6f4f1",
  card: "#ffffff",
  raised: "#f3f0ea",
  border: "#e5e0d8",
  foreground: "#1d1c1a",
  muted: "#6f6a62",
  faint: "#9a948b",

  primary: "#f26222",
  primaryForeground: "#ffffff",
  primarySoft: "rgba(242, 98, 34, 0.10)",

  status: {
    TODO: "#94a3b8",
    IN_PROGRESS: "#3b82f6",
    IN_REVIEW: "#a855f7",
    BLOCKED: "#ef4444",
    DONE: "#22c55e",
  } as Record<string, string>,

  priority: {
    LOW: "#94a3b8",
    MEDIUM: "#eab308",
    HIGH: "#f97316",
    URGENT: "#ef4444",
  } as Record<string, string>,

  success: "#22c55e",
  destructive: "#ef4444",
};

export const radius = { card: 16, input: 12, pill: 999 };

export const STATUS_LABEL: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  BLOCKED: "Blocked",
  DONE: "Done",
};

export const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

/** 15% alpha tint of a hex color for chip backgrounds */
export function tint(hex: string, alpha = 0.15) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

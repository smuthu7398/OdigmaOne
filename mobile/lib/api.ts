import { authClient } from "./auth-client";

const BASE = process.env.EXPO_PUBLIC_API_URL;

type Meta = { page: number; pageSize: number; total: number; totalPages: number };

/** Fetch an /api/v1 endpoint with the stored session cookie attached. */
export async function api<T>(
  path: string,
  init?: RequestInit
): Promise<{ data: T; meta?: Meta }> {
  const cookie = authClient.getCookie();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...init?.headers,
    },
  });
  const body = await res.json();
  if (!body.success) {
    throw new Error(body.error?.message ?? "Request failed");
  }
  return { data: body.data as T, meta: body.meta };
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function taskCode(number: number) {
  return `ODG-${number}`;
}

export function relativeTime(iso: string) {
  const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.trunc(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.trunc(diffSec / 3600), "hour");
  return rtf.format(Math.trunc(diffSec / 86400), "day");
}

export function todayIST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date()
  );
}

export type TaskItem = {
  id: string;
  number: number;
  type: "TASK" | "BUG";
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  progress: number;
  description: string | null;
  client: { id: string; name: string };
  project: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  assignedBy: { id: string; name: string };
  _count?: { comments: number; attachments: number };
};

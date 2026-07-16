import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  Clock,
  FileText,
  BarChart3,
  Bell,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** shown only if the user has this permission (undefined = always) */
  permission?: string;
};

export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Clients", href: "/clients", icon: Users, permission: "client:read" },
      { title: "Projects", href: "/projects", icon: FolderKanban, permission: "project:read" },
      { title: "Tasks", href: "/tasks", icon: CheckSquare, permission: "task:read" },
      { title: "Work Log", href: "/work-log", icon: Clock, permission: "worklog:read" },
    ],
  },
  {
    label: "Library",
    items: [
      { title: "Files", href: "/files", icon: FileText, permission: "file:read" },
      { title: "Reports", href: "/reports", icon: BarChart3, permission: "report:read" },
      { title: "Notifications", href: "/notifications", icon: Bell, permission: "notification:read" },
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

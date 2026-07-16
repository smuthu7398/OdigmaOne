"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import {
  Bug,
  CheckSquare,
  FolderKanban,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  UserRound,
  Users,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { api } from "@/lib/fetcher";
import { taskCode, TASK_STATUS_META } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { NAV_GROUPS } from "./nav";
import { NotificationBell } from "./notification-bell";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type SearchResults = {
  tasks: {
    id: string;
    number: number;
    title: string;
    status: string;
    type: string;
    client: { name: string };
  }[];
  clients: {
    id: string;
    name: string;
    companyName: string | null;
    status: string;
  }[];
  projects: {
    id: string;
    name: string;
    status: string;
    client: { name: string };
  }[];
};

export function Topbar({
  user,
  onMenuClick,
}: {
  user: {
    name: string;
    email: string;
    roleName: string | null;
    permissions: string[];
  };
  onMenuClick: () => void;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const allowed = new Set(user.permissions);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!paletteOpen) setQuery("");
  }, [paletteOpen]);

  const searchQuery = useQuery({
    queryKey: ["search", debounced],
    queryFn: () =>
      api<SearchResults>(`/api/v1/search?q=${encodeURIComponent(debounced)}`),
    enabled: paletteOpen && debounced.length >= 2,
    placeholderData: (prev) => prev,
  });

  const results = debounced.length >= 2 ? searchQuery.data?.data : undefined;

  function go(href: string) {
    setPaletteOpen(false);
    router.push(href);
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </Button>

      <button
        onClick={() => setPaletteOpen(true)}
        className="ml-auto flex h-9 w-full max-w-60 items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 sm:max-w-72"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Search tasks, clients…</span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
          Ctrl K
        </kbd>
      </button>

      <NotificationBell enabled={allowed.has("notification:read")} />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        <Sun className="size-4.5 dark:hidden" />
        <Moon className="hidden size-4.5 dark:block" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button aria-label="Account menu">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs font-normal text-muted-foreground">
              {user.roleName ?? user.email}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <UserRound />
            Profile (soon)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut} variant="destructive">
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search tasks, clients, projects — or jump to a page…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {debounced.length >= 2 && searchQuery.isFetching
              ? "Searching…"
              : "Nothing found."}
          </CommandEmpty>

          {results && results.tasks.length > 0 && (
            <CommandGroup heading="Tasks">
              {results.tasks.map((task) => (
                <CommandItem
                  key={task.id}
                  value={`task-${task.id}`}
                  onSelect={() => go(`/tasks/${task.id}`)}
                >
                  {task.type === "BUG" ? (
                    <Bug className="text-status-blocked" />
                  ) : (
                    <CheckSquare />
                  )}
                  <span className="min-w-0 flex-1 truncate">{task.title}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {taskCode(task.number)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TASK_STATUS_META[task.status].badge}`}
                  >
                    {TASK_STATUS_META[task.status].label}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results && results.clients.length > 0 && (
            <CommandGroup heading="Clients">
              {results.clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={`client-${client.id}`}
                  onSelect={() => go("/clients")}
                >
                  <Users />
                  <span className="min-w-0 flex-1 truncate">{client.name}</span>
                  {client.companyName && (
                    <span className="truncate text-xs text-muted-foreground">
                      {client.companyName}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results && results.projects.length > 0 && (
            <CommandGroup heading="Projects">
              {results.projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`project-${project.id}`}
                  onSelect={() => go("/projects")}
                >
                  <FolderKanban />
                  <span className="min-w-0 flex-1 truncate">
                    {project.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {project.client.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {(!results ||
            (debounced.length < 2 &&
              !searchQuery.isFetching)) && (
            <>
              {NAV_GROUPS.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.items
                    .filter((i) => !i.permission || allowed.has(i.permission))
                    .filter(
                      (i) =>
                        query.length < 2 ||
                        i.title.toLowerCase().includes(query.toLowerCase())
                    )
                    .map((item) => (
                      <CommandItem
                        key={item.href}
                        value={`nav-${item.href}`}
                        onSelect={() => go(item.href)}
                      >
                        <item.icon />
                        {item.title}
                      </CommandItem>
                    ))}
                </CommandGroup>
              ))}
            </>
          )}
        </CommandList>
        </Command>
      </CommandDialog>
    </header>
  );
}

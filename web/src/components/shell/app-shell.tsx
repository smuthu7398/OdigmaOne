"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";
import { Topbar } from "./topbar";

export type ShellUser = {
  id: string;
  name: string;
  email: string;
  roleName: string | null;
  clientId: string | null;
  permissions: string[];
};

export function AppShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-svh">
      {/* desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar lg:block">
        <div className="sticky top-0 h-svh">
          <SidebarNav permissions={user.permissions} />
        </div>
      </aside>

      {/* mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav
            permissions={user.permissions}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

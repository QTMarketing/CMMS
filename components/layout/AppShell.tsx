"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";

type AppShellUser = {
  email?: string | null;
  role?: string;
  technicianId?: string | null;
} | null | undefined;

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: AppShellUser;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  // On login page, render children without sidebar/navbar
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col md:ml-64">
        <TopNavbar
          openSidebar={() => setSidebarOpen(true)}
          user={user}
        />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 py-4 md:px-8 md:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

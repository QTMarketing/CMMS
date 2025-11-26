"use client";

import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/workorders", label: "Work Orders" },
  { href: "/assets", label: "Assets" },
  { href: "/inventory", label: "Inventory" },
  { href: "/schedules", label: "Schedules" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <TopNavbar openSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 py-4 md:px-8 md:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

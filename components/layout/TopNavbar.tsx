"use client";

import { usePathname } from "next/navigation";
import React from "react";
import { signOut } from "next-auth/react";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/workorders": "Work Orders",
  "/assets": "Assets",
  "/inventory": "Inventory",
  "/schedules": "Schedules",
};

type TopNavbarUser = {
  email?: string | null;
  role?: string;
  technicianId?: string | null;
} | null | undefined;

export default function TopNavbar({
  openSidebar,
  user,
}: {
  openSidebar?: () => void;
  user?: TopNavbarUser;
}) {
  // Legacy top navbar (with admin@example.com / Admin / Logout) has been
  // fully retired in favor of the new DashboardHeader-style user profile
  // + notifications UI. We keep this component around so existing
  // layout code can still import it, but it renders nothing.
  //
  // All pages now rely on their own headers or the shared dashboard
  // header components instead of this bar.
    return null;
}

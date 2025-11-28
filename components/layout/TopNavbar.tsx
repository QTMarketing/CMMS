"use client";

import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/workorders": "Work Orders",
  "/assets": "Assets",
  "/inventory": "Inventory",
  "/schedules": "Schedules",
  "/technicians": "Technicians",
  "/users": "Users Management",
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
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const sessionUser = (session?.user as TopNavbarUser) ?? null;
  const effectiveUser = sessionUser ?? user;

  useEffect(() => {
    setMounted(true);
  }, []);
  const title =
    pageTitles[pathname] ||
    pageTitles[
      Object.keys(pageTitles).find((route) => pathname.startsWith(route)) || ""
    ] ||
    "";

  const roleLabel =
    effectiveUser?.role === "ADMIN"
      ? "Admin"
      : effectiveUser?.role === "TECHNICIAN"
      ? "Technician"
      : undefined;

  return (
    <header className="bg-white dark:bg-slate-900 shadow h-12 sm:h-16 flex items-center px-2 sm:px-4 md:px-6 justify-between border-b border-gray-200 dark:border-slate-700 w-full">
      {/* Hamburger for mobile */}
      <button
        type="button"
        className="md:hidden text-orange-600 mr-2 text-xl sm:text-2xl focus:outline-none z-50"
        aria-label="Open sidebar"
        onClick={openSidebar}
      >
        <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
          <rect y="5" width="24" height="2" rx="1" fill="currentColor" />
          <rect y="11" width="24" height="2" rx="1" fill="currentColor" />
          <rect y="17" width="24" height="2" rx="1" fill="currentColor" />
        </svg>
      </button>
      <span className="text-base sm:text-xl font-semibold text-orange-600 ml-2 md:ml-0">
        {title}
      </span>
      <div className="flex items-center gap-2">
        {effectiveUser?.email && (
          <div className="hidden sm:flex flex-col items-end mr-1">
            <span className="text-xs text-gray-700">{effectiveUser.email}</span>
            {roleLabel && (
              <span className="text-[10px] mt-0.5 inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium uppercase tracking-wide">
                {roleLabel}
              </span>
            )}
          </div>
        )}
        {mounted && (
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white border border-gray-200 dark:border-slate-600 rounded-full px-2 py-1"
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        )}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-full px-2 py-1"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

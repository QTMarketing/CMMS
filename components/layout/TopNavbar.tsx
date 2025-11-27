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
  const pathname = usePathname();
  const title =
    pageTitles[pathname] ||
    pageTitles[
      Object.keys(pageTitles).find((route) => pathname.startsWith(route)) || ""
    ] ||
    "";

  const roleLabel =
    user?.role === "ADMIN"
      ? "Admin"
      : user?.role === "TECHNICIAN"
      ? "Technician"
      : undefined;

  return (
    <header className="bg-white shadow h-12 sm:h-16 flex items-center px-2 sm:px-4 md:px-6 justify-between border-b border-gray-200 w-full">
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
        {user?.email && (
          <div className="hidden sm:flex flex-col items-end mr-1">
            <span className="text-xs text-gray-700">{user.email}</span>
            {roleLabel && (
              <span className="text-[10px] mt-0.5 inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium uppercase tracking-wide">
                {roleLabel}
              </span>
            )}
          </div>
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

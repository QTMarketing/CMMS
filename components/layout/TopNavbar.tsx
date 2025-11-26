"use client";

import { usePathname } from "next/navigation";
import React from "react";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/workorders": "Work Orders",
  "/assets": "Assets",
  "/inventory": "Inventory",
  "/schedules": "Schedules",
};

export default function TopNavbar({ openSidebar }: { openSidebar?: () => void }) {
  const pathname = usePathname();
  const title =
    pageTitles[pathname] ||
    pageTitles[
      Object.keys(pageTitles).find((route) => pathname.startsWith(route)) || ""
    ] ||
    "";
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
      <span className="text-base sm:text-xl font-semibold text-orange-600 ml-2 md:ml-0">{title}</span>
      {/* Placeholder for avatar/user */}
      <div className="w-8 h-8 rounded-full bg-gray-200" />
    </header>
  );
}

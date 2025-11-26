"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const navItems = [
  { name: "Dashboard", href: "/" },
  { name: "Work Orders", href: "/workorders" },
  { name: "Assets", href: "/assets" },
  { name: "Inventory", href: "/inventory" },
  { name: "Schedules", href: "/schedules" },
];

export default function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  // Detect small screen (tailwind's md: break) using matchMedia
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    setIsMobile(query.matches);
    const handler = (ev: MediaQueryListEvent) => setIsMobile(ev.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  // Hide sidebar ONLY on mobile if not open, always show on desktop
  if (isMobile && !open) return null;

  // Sidebar overlay for mobile
  return (
    <>
      {isMobile && (
        <div className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={onClose} />
      )}
      <aside
        className={`z-50 flex flex-col h-full md:w-64 fixed md:static top-0 left-0 min-h-screen
          bg-orange-600 text-white w-3/4 max-w-xs md:max-w-none
          ${isMobile ? "fixed shadow-xl transition-transform duration-300" : "md:flex md:flex-col border-r border-orange-500 static w-64"}
          ${isMobile ? (open ? "translate-x-0" : "-translate-x-full") : "translate-x-0"}`}
        style={isMobile ? { height: "100vh" } : {}}
        onClick={e => e.stopPropagation()}
      >
        <div className="h-12 md:h-16 flex items-center justify-center text-base md:text-2xl font-bold border-b border-orange-500 px-2 md:px-0">
          LAMAFIX
        </div>
        <nav className="flex-1 mt-1 md:mt-2">
          <ul className="gap-0 md:gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name} className="my-0">
                  <Link
                    href={item.href}
                    className={`block px-4 py-3 md:px-6 md:py-3 transition rounded-none ${isMobile ? "text-base" : "text-sm"} ${isActive ? "bg-white text-orange-600 font-semibold" : "hover:bg-orange-500 hover:text-white"}`}
                    onClick={() => isMobile && onClose && onClose()}
                  >
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}

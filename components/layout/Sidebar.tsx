"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import TechnicianStatusToggle from "@/components/technicians/TechnicianStatusToggle";

const allNavItems = [
  { name: "Dashboard", href: "/" },
  { name: "Work Orders", href: "/workorders" },
  { name: "Preventive Maintenance Schedules", href: "/pm" },
  { name: "Vendor", href: "/technicians" },
  { name: "Requests", href: "/requests" },
  { name: "Locations", href: "/stores" },
  { name: "Users", href: "/users" },
  { name: "Reports", href: "/reports" },
];

export default function Sidebar({
  open,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const email = (session?.user as any)?.email as string | undefined;
  const technicianId = (session?.user as any)?.technicianId as string | undefined;
  const isTechnician = role === "TECHNICIAN";
  const isUser = role === "USER";
  const isStoreAdmin = role === "STORE_ADMIN";
  const [userName, setUserName] = useState<string>("");
  const [categories, setCategories] = useState<{ id: string; name: string; color?: string | null }[]>([]);

  // Fetch technician name if user is a technician
  useEffect(() => {
    if (isTechnician && technicianId) {
      fetch(`/api/technicians/${technicianId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch technician");
          return res.json();
        })
        .then((data) => {
          if (data.success && data.data) {
            setUserName(data.data.name);
          } else {
            setUserName(email || "");
          }
        })
        .catch(() => {
          // Fallback to email if fetch fails
          setUserName(email || "");
        });
    } else {
      // For non-technicians, use email or role-based name
      if (email) {
        // Extract name from email (part before @)
        const nameFromEmail = email.split("@")[0];
        // Capitalize first letter of each word
        setUserName(
          nameFromEmail
            .split(".")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        );
      } else {
        setUserName(
          role === "MASTER_ADMIN"
            ? "Master Admin"
            : role === "STORE_ADMIN"
              ? "Store Admin"
              : role || "User"
        );
      }
    }
  }, [isTechnician, technicianId, email, role]);

  // Fetch categories for admin roles
  useEffect(() => {
    const isAdminLike = role === "MASTER_ADMIN" || role === "ADMIN" || role === "STORE_ADMIN";
    if (isAdminLike && session) {
      fetch("/api/store-categories", { cache: "no-store" })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch categories");
          return res.json();
        })
        .then((data) => {
          if (data.success && data.data) {
            setCategories(data.data);
          }
        })
        .catch(() => {
          // Silently fail - categories are optional
        });
    }
  }, [role, session]);

  // Get active category from URL
  const activeCategoryId = searchParams?.get("category") || null;

  // Get role display name
  const getRoleDisplayName = () => {
    switch (role) {
      case "MASTER_ADMIN":
        return "Master Admin";
      case "STORE_ADMIN":
        return "Store Admin";
      case "TECHNICIAN":
        return "Technician";
      case "ADMIN":
        return "Admin";
      case "USER":
        return "User";
      default:
        return "User";
    }
  };

  // Filter nav items based on role
  // Technicians can only see Dashboard and PM Schedules
  // Users can only see Work Orders and Requests (to create work orders and requests)
  // STORE_ADMIN can only see Dashboard, Work Orders, and PM Schedules (like USER but with dashboard)
  // Reports is visible to ADMIN and MASTER_ADMIN (not STORE_ADMIN)
  // Users management is only visible to MASTER_ADMIN
  const isMasterAdmin = role === "MASTER_ADMIN";
  const isAdmin = role === "ADMIN";
  const navItems = isTechnician
    ? allNavItems.filter(
        (item) => item.href === "/" || item.href === "/pm"
      )
    : isUser
      ? allNavItems.filter(
          (item) => item.href === "/workorders" || item.href === "/requests"
        )
      : isStoreAdmin
        ? allNavItems.filter(
            (item) => item.href === "/" || item.href === "/workorders" || item.href === "/pm"
        )
      : allNavItems.filter(
          (item) => {
            // Users only for master admin
            if (item.href === "/users") {
              return isMasterAdmin;
            }
              // Reports for admin and master admin (not for STORE_ADMIN)
            if (item.href === "/reports") {
              return isMasterAdmin || isAdmin;
            }
            return true;
          }
        );

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
        <div
          className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={onClose}
        />
      )}
      <aside
        className={`z-50 flex flex-col h-screen fixed top-0 left-0 w-3/4 max-w-xs md:max-w-none md:w-64
          bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
          ${isMobile ? "shadow-xl transition-transform duration-300" : ""}
          ${isMobile ? (open ? "translate-x-0" : "-translate-x-full") : "translate-x-0"}
          overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-2 mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Lamafix
          </h1>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const isLocations = item.href === "/stores";
            // Only highlight Locations if we're on Locations, Assets, or Parts pages
            const isLocationsPageActive = isLocations && (pathname === "/stores" || pathname === "/assets" || pathname === "/inventory");
            // Only apply Locations active state to the Locations item itself
            const shouldHighlight = isLocations ? isLocationsPageActive : isActive;
            
            return (
              <div key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition ${
                    shouldHighlight
                      ? "bg-[#4361EE] text-white"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  onClick={() => isMobile && onClose && onClose()}
                >
                  <span>{item.name}</span>
                </Link>
                {/* Show categories as sub-items under Locations */}
                {isLocations && categories.length > 0 && (
                  <div className="ml-4 mt-1 space-y-1">
                    {categories.map((cat) => {
                      const isCategoryActive = activeCategoryId === cat.id;
                      return (
                        <Link
                          key={cat.id}
                          href={`/stores?category=${cat.id}`}
                          className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-lg transition ${
                            isCategoryActive
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              : "text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                          onClick={() => isMobile && onClose && onClose()}
                        >
                          {cat.color && (
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                          )}
                          <span>{cat.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="mt-auto space-y-2 border-t border-slate-200 dark:border-slate-700 pt-4 pb-4">
          {/* Profile Section */}
          {session && (
            <div className="px-4 py-3 mb-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-semibold">
                  {userName ? userName.charAt(0).toUpperCase() : email?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {userName || email || "User"}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                    {email || ""}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                    {getRoleDisplayName()}
                  </p>
                </div>
              </div>
              {/* Status Toggle for Technicians */}
              {isTechnician && (
                <div className="mt-3">
                  <TechnicianStatusToggle />
                </div>
              )}
            </div>
          )}
          
          <Link
            href="/settings"
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => isMobile && onClose && onClose()}
          >
            <span>Settings</span>
          </Link>
          <Link
            href="/help"
            className="flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => isMobile && onClose && onClose()}
          >
            <div className="flex items-center gap-3">
              <span>Help & Support</span>
            </div>
            <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">
              8
            </span>
          </Link>
          
          {/* Logout Button - Always visible */}
          {session && (
          <button
            onClick={() => {
              signOut({ callbackUrl: "/login" });
              if (isMobile && onClose) onClose();
            }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              type="button"
          >
            <span>Logout</span>
          </button>
          )}
        </div>
      </aside>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Store = {
  id: string;
  name: string;
  code?: string | null;
};

type District = {
  id: string;
  name: string;
  divisionId: string;
  stores: Store[];
};

type Division = {
  id: string;
  name: string;
  districts: District[];
};

const STORE_SUB_ITEMS = [
  { label: "Assets", href: (storeId: string) => `/stores/${storeId}/assets`, icon: "🔧" },
  { label: "Parts", href: (storeId: string) => `/stores/${storeId}/parts`, icon: "📦" },
  {
    label: "Preventive Maintenance",
    href: (storeId: string) => `/stores/${storeId}/preventive-maintenance`,
    icon: "🗓️",
  },
  {
    label: "Work Orders",
    href: (storeId: string) => `/stores/${storeId}/work-orders`,
    icon: "📋",
  },
  {
    label: "Work Order History",
    href: (storeId: string) => `/stores/${storeId}/work-order-history`,
    icon: "📜",
  },
] as const;

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      className={`inline-block h-4 w-4 shrink-0 transition-transform duration-200 ${
        open ? "rotate-90" : "rotate-0"
      }`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </span>
  );
}

export default function StoreTree() {
  const pathname = usePathname();
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Open state: allow multiple open at each level (consistent multi-expand)
  const [openDivisionIds, setOpenDivisionIds] = useState<Set<string>>(new Set());
  const [openDistrictIds, setOpenDistrictIds] = useState<Set<string>>(new Set());
  const [openStoreIds, setOpenStoreIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/divisions", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch divisions");
        return res.json();
      })
      .then((data) => {
        if (data.success && data.data) {
          setDivisions(data.data);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load tree");
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleDivision = (id: string) => {
    setOpenDivisionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDistrict = (id: string) => {
    setOpenDistrictIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStore = (id: string) => {
    setOpenStoreIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isStorePath = pathname?.startsWith("/stores/") && pathname !== "/stores";
  const storeIdFromPath = isStorePath ? pathname.replace("/stores/", "").split("/")[0].split("?")[0] : null;
  const currentStoreId = storeIdFromPath ?? null;

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        Loading tree…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (divisions.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        No divisions yet. Add divisions and districts to see the tree.
      </div>
    );
  }

  return (
    <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200 bg-white text-sm">
      <div className="p-2">
        {divisions.map((division) => {
          const divOpen = openDivisionIds.has(division.id);
          return (
            <div key={division.id} className="select-none">
              {/* Division row */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleDivision(division.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleDivision(division.id);
                  }
                }}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
                  divOpen ? "bg-slate-100" : "hover:bg-slate-50"
                }`}
              >
                <Chevron open={divOpen} />
                <span className="text-base">📁</span>
                <span className="font-medium text-slate-800">{division.name}</span>
              </div>

              {/* Districts (indented) */}
              {divOpen && (
                <div className="ml-4 border-l border-slate-200 pl-2 transition-all duration-200">
                  {division.districts.map((district) => {
                    const distOpen = openDistrictIds.has(district.id);
                    return (
                      <div key={district.id} className="py-0.5">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleDistrict(district.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleDistrict(district.id);
                            }
                          }}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
                            distOpen ? "bg-slate-100" : "hover:bg-slate-50"
                          }`}
                        >
                          <Chevron open={distOpen} />
                          <span className="text-base">📁</span>
                          <span className="text-slate-700">{district.name}</span>
                        </div>

                        {/* Stores (indented) */}
                        {distOpen && (
                          <div className="ml-4 border-l border-slate-200 pl-2 transition-all duration-200">
                            {district.stores.map((store) => {
                              const storeOpen = openStoreIds.has(store.id);
                              const isActiveStore = store.id === currentStoreId;
                              return (
                                <div key={store.id} className="py-0.5">
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => toggleStore(store.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        toggleStore(store.id);
                                      }
                                    }}
                                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
                                      isActiveStore ? "bg-blue-100 text-blue-800" : storeOpen ? "bg-slate-100" : "hover:bg-slate-50"
                                    }`}
                                  >
                                    <Chevron open={storeOpen} />
                                    <span className="text-base">📁</span>
                                    <span className={isActiveStore ? "font-medium" : ""}>
                                      {store.name}
                                      {store.code ? ` (${store.code})` : ""}
                                    </span>
                                  </div>

                                  {/* Sub-items (Assets, Parts, etc.) */}
                                  {storeOpen && (
                                    <div className="ml-4 border-l border-slate-200 pl-2 transition-all duration-200">
                                      {STORE_SUB_ITEMS.map((item) => {
                                        const href = item.href(store.id);
                                        const isActive = pathname === href;
                                        return (
                                          <div key={item.label} className="py-0.5">
                                            <Link
                                              href={href}
                                              className={`flex items-center gap-2 rounded-md px-2 py-1 pl-6 text-slate-600 no-underline transition-colors hover:bg-slate-50 hover:text-slate-900 ${
                                                isActive ? "bg-blue-50 font-medium text-blue-700" : ""
                                              }`}
                                            >
                                              <span>{item.icon}</span>
                                              <span>{item.label}</span>
                                            </Link>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

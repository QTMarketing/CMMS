"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Badge from "../../components/ui/Badge";
import DashboardHeader, {
  DashboardSearchItem,
} from "@/components/dashboard/DashboardHeader";
import AddAssetDrawer from "./components/AddAssetDrawer";
import BulkImportDrawer from "@/components/BulkImportDrawer";

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-600",
  Down: "bg-red-100 text-red-600",
  Retired: "bg-gray-200 text-gray-600",
};

type DateInput = string | Date | null | undefined;

function formatDate(date: DateInput) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString();
}

function nextDueDays(nextDate?: string) {
  if (!nextDate) return "—";
  const now = new Date();
  const next = new Date(nextDate);
  const delta = Math.ceil(
    (next.getTime() - now.getTime()) / (1000 * 3600 * 24)
  );
  if (isNaN(delta)) return "—";
  return delta >= 0 ? delta.toString() : `Overdue (${Math.abs(delta)})`;
}

export default function AssetsPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const email = ((session?.user as any)?.email as string) ?? "";
  const role = (session?.user as any)?.role as string | undefined;
  const isTechnician = role === "TECHNICIAN";
  const isStoreAdmin = role === "STORE_ADMIN";
  const isSessionLoading = sessionStatus === "loading";

  // Redirect technicians and STORE_ADMIN away from this page
  useEffect(() => {
    if (!isSessionLoading) {
      if (isTechnician) {
      router.push("/");
      } else if (isStoreAdmin) {
        router.push("/workorders");
      }
    }
  }, [isSessionLoading, isTechnician, isStoreAdmin, router]);

  // Show nothing while redirecting technicians or STORE_ADMIN
  if ((isTechnician || isStoreAdmin) && !isSessionLoading) {
    return null;
  }
  const [assets, setAssets] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [pmSummaries, setPmSummaries] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Filter state:
  // - typeFilter: group by whether an asset has a parent ID or not
  // - locationFilter: cycle through All + each distinct location
  // - statusFilter: filter by asset.status
  // - lastMaintFilter: filter by whether lastMaintenanceDate exists
  const [typeFilter, setTypeFilter] = useState<"all" | "parent" | "child">(
    "all"
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | "Active" | "Down" | "Retired"
  >("all");
  const [lastMaintFilter, setLastMaintFilter] = useState<
    "all" | "has" | "none"
  >("all");
  const [locationFilterIndex, setLocationFilterIndex] = useState(0);

  useEffect(() => {
    fetch("/api/assets", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          console.error("Failed to fetch assets:", res.status);
          return [];
        }
        return res.json();
      })
      .then((data) => setAssets(Array.isArray(data) ? data : data.data || []))
      .catch((err) => {
        console.error("Error fetching assets:", err);
        setAssets([]);
      });

    // Load work orders once so we can compute per-asset workload counts
    fetch("/api/workorders", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          console.error("Failed to fetch work orders:", res.status);
          return [];
        }
        return res.json();
      })
      .then((data) =>
        setWorkOrders(Array.isArray(data) ? data : data.data || [])
      )
      .catch((err) => {
        console.error("Error fetching work orders:", err);
        setWorkOrders([]);
      });

    // Load preventive schedules so we can show a light PM status indicator per asset
    fetch("/api/schedules", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          console.error("Failed to fetch schedules:", res.status);
          return [];
        }
        return res.json();
      })
      .then((data) =>
        setPmSummaries(Array.isArray(data) ? data : data.data || [])
      )
      .catch((err) => {
        console.error("Error fetching schedules:", err);
        setPmSummaries([]);
      });
  }, []);

  const countsByAsset = useMemo(() => {
    const counts: Record<
      string,
      {
        total: number;
        open: number;
      }
    > = {};

    for (const wo of workOrders) {
      if (!wo || !wo.assetId) continue;
      const existing = counts[wo.assetId] || { total: 0, open: 0 };
      existing.total += 1;
      if (wo.status === "Open") existing.open += 1;
      counts[wo.assetId] = existing;
    }

    return counts;
  }, [workOrders]);

  // Build a quick PM status summary per asset using daysUntilDue / due flags from /api/schedules
  const pmByAsset = useMemo(() => {
    const pm: Record<
      string,
      { hasPm: boolean; status: "on-track" | "due-soon" | "overdue" }
    > = {};

    for (const pmItem of pmSummaries as any[]) {
      const assetId = pmItem.assetId;
      if (!assetId) continue;

      const current = pm[assetId] || {
        hasPm: false,
        status: "on-track" as const,
      };

      current.hasPm = true;

      const daysUntilDue = pmItem.daysUntilDue;
      const isDue = pmItem.due; // from API: true when daysUntilDue <= 0 and active

      if (isDue) {
        current.status = "overdue";
      } else if (typeof daysUntilDue === "number" && daysUntilDue <= 7) {
        // within a week
        if (current.status !== "overdue") {
          current.status = "due-soon";
        }
      }

      pm[assetId] = current;
    }

    return pm;
  }, [pmSummaries]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortValue = (asset: any, column: string): string | number => {
    switch (column) {
      case "assetId":
        return asset.assetId?.toString() || "";
      case "name":
        return asset.name?.toLowerCase() || "";
      case "location":
        return asset.location?.toLowerCase() || "";
      case "status":
        return asset.status?.toLowerCase() || "";
      case "make":
        return asset.make?.toLowerCase() || "";
      case "model":
        return asset.model?.toLowerCase() || "";
      case "category":
        return asset.category?.toLowerCase() || "";
      case "lastMaintenance":
        return asset.lastMaintenanceDate
          ? new Date(asset.lastMaintenanceDate).getTime()
          : 0;
      case "nextMaintenance":
        return asset.nextMaintenanceDate
          ? new Date(asset.nextMaintenanceDate).getTime()
          : 0;
      case "totalWOs":
        return countsByAsset[asset.id]?.total || 0;
      case "openWOs":
        return countsByAsset[asset.id]?.open || 0;
      default:
        return "";
    }
  };

  // Distinct locations for the Location filter (excluding empty)
  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    for (const a of assets) {
      if (a.location && typeof a.location === "string") {
        set.add(a.location);
      }
    }
    return ["All", ...Array.from(set).sort()];
  }, [assets]);

  const locationFilterLabel =
    locationOptions[locationFilterIndex] ?? locationOptions[0] ?? "All";

  const sorted = useMemo(() => {
    const assetsCopy = [...assets];
    if (!sortColumn) {
      // Default sort by name if no column selected
      return assetsCopy.sort((a, b) => a.name?.localeCompare(b.name || "") || 0);
    }
    return assetsCopy.sort((a, b) => {
      const aVal = getSortValue(a, sortColumn);
      const bVal = getSortValue(b, sortColumn);
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      const comparison = aStr.localeCompare(bStr);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [assets, sortColumn, sortDirection, countsByAsset]);

  const visibleAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((a) => {
      // Text search
      if (q) {
        const matchesSearch =
          a.id?.toLowerCase().includes(q) ||
          a.name?.toLowerCase().includes(q) ||
          a.location?.toLowerCase().includes(q) ||
          a.make?.toLowerCase().includes(q) ||
          a.model?.toLowerCase().includes(q) ||
          a.category?.toLowerCase().includes(q) ||
          a.parentAssetName?.toLowerCase().includes(q) ||
          (a.assetId && a.assetId.toString().includes(q)) ||
          (a.parentAssetIdNumber &&
            a.parentAssetIdNumber.toString().includes(q));
        if (!matchesSearch) return false;
      }

      // Type filter: parent vs child assets
      if (typeFilter === "parent" && a.parentAssetIdNumber != null) {
        return false;
      }
      if (typeFilter === "child" && a.parentAssetIdNumber == null) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && a.status !== statusFilter) {
        return false;
      }

      // Location filter
      if (
        locationFilterLabel !== "All" &&
        (a.location || "") !== locationFilterLabel
      ) {
        return false;
      }

      // Last maintenance filter
      const hasLastMaint = !!a.lastMaintenanceDate;
      if (lastMaintFilter === "has" && !hasLastMaint) {
        return false;
      }
      if (lastMaintFilter === "none" && hasLastMaint) {
        return false;
      }

      return true;
    });
  }, [
    sorted,
    search,
    typeFilter,
    statusFilter,
    locationFilterLabel,
    lastMaintFilter,
  ]);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const pendingCount = workOrders.filter(
    (w) => w.status === "Open" || w.status === "In Progress"
  ).length;

  const overdueCount = workOrders.filter((w) => {
    if (!w.dueDate) return false;
    const due = new Date(w.dueDate);
    const dueDay = new Date(
      due.getFullYear(),
      due.getMonth(),
      due.getDate()
    );
    const isCompleted =
      w.status === "Completed" || w.status === "Cancelled";
    return !isCompleted && dueDay < today;
  }).length;

  const scheduledMaintenanceCount = pmSummaries.length;

  const searchItems: DashboardSearchItem[] = useMemo(
    () => [
      // Assets
      ...assets.map((a) => ({
        id: a.id,
        type: "asset" as const,
        title: a.name,
        description: a.location,
        href: `/assets/${a.id}`,
      })),
      // Work orders (basic)
      ...workOrders.map((w) => ({
        id: w.id,
        type: "workorder" as const,
        title: w.title,
        description: w.assetId ? `Asset: ${w.assetId}` : undefined,
        href: `/workorders/${w.id}`,
      })),
    ],
    [assets, workOrders]
  );

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <DashboardHeader
        email={email}
        pendingCount={pendingCount}
        overdueCount={overdueCount}
        scheduledMaintenanceCount={scheduledMaintenanceCount}
        searchItems={searchItems}
      />

      {/* Page heading */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          Assets
        </h1>
        <div className="flex items-center gap-2">
          <BulkImportDrawer type="assets" />
        <AddAssetDrawer />
        </div>
      </header>

      {/* Toolbar & filters */}
      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <span className="text-sm" aria-hidden="true">
                🔍
              </span>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Asset ID or Name..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-lg p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            >
              <span className="text-sm" aria-hidden="true">
                ⚙
              </span>
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-lg p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            >
              <span className="text-sm" aria-hidden="true">
                ⬇
              </span>
            </button>
          </div>
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-700">Sort by:</label>
          <select
            value={sortColumn || ""}
            onChange={(e) => {
              const value = e.target.value;
              if (value) {
                setSortColumn(value);
              } else {
                setSortColumn(null);
              }
            }}
            className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Name (Default)</option>
            <option value="assetId">Asset ID</option>
            <option value="name">Asset Name</option>
            <option value="make">Make</option>
            <option value="model">Model</option>
            <option value="category">Category</option>
            <option value="location">Location</option>
            <option value="status">Status</option>
            <option value="lastMaintenance">Last Maintenance</option>
            <option value="nextMaintenance">Next Maintenance</option>
            <option value="totalWOs">Total Work Orders</option>
            <option value="openWOs">Open Work Orders</option>
          </select>
          {sortColumn && (
            <select
              value={sortDirection}
              onChange={(e) =>
                setSortDirection(e.target.value as "asc" | "desc")
              }
              className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="asc">Ascending ↑</option>
              <option value="desc">Descending ↓</option>
            </select>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-700 hover:bg-slate-200"
            onClick={() => {
              setTypeFilter((prev) =>
                prev === "all" ? "parent" : prev === "parent" ? "child" : "all"
              );
            }}
          >
            <span>
              Type:{" "}
              {typeFilter === "all"
                ? "All"
                : typeFilter === "parent"
                ? "Parent Assets"
                : "Child Assets"}
            </span>
            <span className="text-xs" aria-hidden="true">
              ▾
            </span>
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-700 hover:bg-slate-200"
            onClick={() => {
              // Cycle through available locations
              setLocationFilterIndex((prev) =>
                locationOptions.length === 0
                  ? 0
                  : (prev + 1) % locationOptions.length
              );
            }}
          >
            <span>
              Location:{" "}
              {locationFilterLabel === "All"
                ? "All"
                : locationFilterLabel || "All"}
            </span>
            <span className="text-xs" aria-hidden="true">
              ▾
            </span>
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-700 hover:bg-slate-200"
            onClick={() => {
              setStatusFilter((prev) => {
                if (prev === "all") return "Active";
                if (prev === "Active") return "Down";
                if (prev === "Down") return "Retired";
                return "all";
              });
            }}
          >
            <span>
              Status: {statusFilter === "all" ? "All" : statusFilter}
            </span>
            <span className="text-xs" aria-hidden="true">
              ▾
            </span>
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-700 hover:bg-slate-200"
            onClick={() => {
              setLastMaintFilter((prev) =>
                prev === "all" ? "has" : prev === "has" ? "none" : "all"
              );
            }}
          >
            <span>
              Last Maintenance:{" "}
              {lastMaintFilter === "all"
                ? "Any"
                : lastMaintFilter === "has"
                ? "With Date"
                : "None"}
            </span>
            <span className="text-xs" aria-hidden="true">
              ▾
            </span>
          </button>
        </div>
      </section>

      {/* Assets table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="p-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="p-4">
                  <div className="flex items-center gap-1">
                    Asset ID
                    {sortColumn === "assetId" && (
                      <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="p-4">
                  <div className="flex items-center gap-1">
                    Asset Name
                    {sortColumn === "name" && (
                      <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="p-4">Parent Asset ID</th>
                <th className="p-4">Parent Asset Name</th>
                <th className="p-4">Tool Check-Out</th>
                <th className="p-4">Check-Out Approval</th>
                <th className="p-4">Default WO Template</th>
                <th className="p-4">
                  <div className="flex items-center gap-1">
                    Make
                    {sortColumn === "make" && (
                      <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="p-4">
                  <div className="flex items-center gap-1">
                    Model
                    {sortColumn === "model" && (
                      <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="p-4">
                  <div className="flex items-center gap-1">
                    Category
                    {sortColumn === "category" && (
                      <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="p-4">
                  <div className="flex items-center gap-1">
                    Location
                    {sortColumn === "location" && (
                      <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="p-4">
                  <div className="flex items-center gap-1">
                    Status
                    {sortColumn === "status" && (
                      <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="p-4">
                  <div className="flex items-center gap-1">
                    Last Maintenance
                    {sortColumn === "lastMaintenance" && (
                      <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="p-4">
                  <div className="flex items-center gap-1">
                    Next Maintenance
                    {sortColumn === "nextMaintenance" && (
                      <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="p-4">
                  <div className="flex items-center gap-1">
                    Total WOs
                    {sortColumn === "totalWOs" && (
                      <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="p-4">
                  <div className="flex items-center gap-1">
                    Open WOs
                    {sortColumn === "openWOs" && (
                      <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="p-4">PM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visibleAssets.length === 0 ? (
                <tr>
                  <td
                    colSpan={18}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    No assets found.
                  </td>
                </tr>
              ) : (
                visibleAssets.map((a) => {
                  const counts = countsByAsset[a.id] || { total: 0, open: 0 };
                  const pm = pmByAsset[a.id];
                  let pmLabel = "";
                  let pmClass = "";
                  if (pm?.hasPm) {
                    if (pm.status === "overdue") {
                      pmLabel = "PM Overdue";
                      pmClass = "bg-red-50 text-red-700";
                    } else if (pm.status === "due-soon") {
                      pmLabel = "PM Due";
                      pmClass = "bg-amber-50 text-amber-700";
                    } else {
                      pmLabel = "PM";
                      pmClass = "bg-slate-100 text-slate-600";
                    }
                  }

                  return (
                    <tr
                      key={a.id}
                      className={`cursor-pointer hover:bg-slate-50 ${
                        a.status === "Down" ? "bg-red-50" : ""
                      }`}
                      onClick={() => router.push(`/assets/${a.id}`)}
                    >
                      <td className="p-4 align-top">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="p-4 align-top font-mono text-xs text-slate-700">
                        {a.assetId ?? "—"}
                      </td>
                      <td className="p-4 align-top">
                        <Link
                          href={`/assets/${a.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-slate-900 hover:text-blue-600 hover:underline"
                        >
                          {a.name}
                        </Link>
                      </td>
                      <td className="p-4 align-top text-slate-600">
                        {a.parentAssetIdNumber ?? "—"}
                      </td>
                      <td className="p-4 align-top text-slate-600">
                        {a.parentAssetName ?? "—"}
                      </td>
                      <td className="p-4 align-top text-slate-600">
                        {a.toolCheckOut ?? 0}
                      </td>
                      <td className="p-4 align-top text-slate-600">
                        {a.checkOutRequiresApproval === 1 ? "Yes" : "No"}
                      </td>
                      <td className="p-4 align-top text-slate-600">
                        {a.defaultWOTemplate ?? "—"}
                      </td>
                      <td className="p-4 align-top text-slate-600">
                        {a.make ?? "—"}
                      </td>
                      <td className="p-4 align-top text-slate-600">
                        {a.model ?? "—"}
                      </td>
                      <td className="p-4 align-top text-slate-600">
                        {a.category ?? "—"}
                      </td>
                      <td className="p-4 align-top text-slate-600">
                        {a.location ?? "—"}
                      </td>
                      <td className="p-4 align-top">
                        <Badge colorClass={statusColors[a.status] || ""}>
                          {a.status}
                        </Badge>
                      </td>
                      <td className="p-4 align-top text-slate-600">
                        {formatDate(a.lastMaintenanceDate)}
                      </td>
                      <td className="p-4 align-top text-slate-600">
                        {formatDate(a.nextMaintenanceDate)}
                      </td>
                      <td className="p-4 align-top text-slate-600">
                        {counts.total}
                      </td>
                      <td className="p-4 align-top text-slate-600">
                        {counts.open}
                      </td>
                      <td className="p-4 align-top">
                        {pm && pmLabel && (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${pmClass}`}
                          >
                            {pmLabel}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer (visual only, no actual paging yet) */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
          <span>
            Showing{" "}
            <span className="font-semibold">{visibleAssets.length}</span> of{" "}
            <span className="font-semibold">{assets.length}</span> results
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            >
              <span className="text-sm" aria-hidden="true">
                ‹
              </span>
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            >
              <span className="text-sm" aria-hidden="true">
                ›
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}


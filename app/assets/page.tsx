"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
  const isSessionLoading = sessionStatus === "loading";

  // Redirect technicians away from this page
  useEffect(() => {
    if (!isSessionLoading && isTechnician) {
      router.push("/");
    }
  }, [isSessionLoading, isTechnician, router]);

  // Show nothing while redirecting technicians
  if (isTechnician && !isSessionLoading) {
    return null;
  }
  const [assets, setAssets] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [pmSummaries, setPmSummaries] = useState<any[]>([]);
  const [search, setSearch] = useState("");

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

  const countsByAsset: Record<
    string,
    {
      total: number;
      open: number;
    }
  > = {};

  for (const wo of workOrders) {
    if (!wo || !wo.assetId) continue;
    const existing = countsByAsset[wo.assetId] || { total: 0, open: 0 };
    existing.total += 1;
    if (wo.status === "Open") existing.open += 1;
    countsByAsset[wo.assetId] = existing;
  }

  // Build a quick PM status summary per asset using daysUntilDue / due flags from /api/schedules
  const pmByAsset: Record<
    string,
    { hasPm: boolean; status: "on-track" | "due-soon" | "overdue" }
  > = {};

  for (const pm of pmSummaries as any[]) {
    const assetId = pm.assetId;
    if (!assetId) continue;

    const current = pmByAsset[assetId] || {
      hasPm: false,
      status: "on-track" as const,
    };

    current.hasPm = true;

    const daysUntilDue = pm.daysUntilDue;
    const isDue = pm.due; // from API: true when daysUntilDue <= 0 and active

    if (isDue) {
      current.status = "overdue";
    } else if (typeof daysUntilDue === "number" && daysUntilDue <= 7) {
      // within a week
      if (current.status !== "overdue") {
        current.status = "due-soon";
      }
    }

    pmByAsset[assetId] = current;
  }

  const sorted = useMemo(
    () => [...assets].sort((a, b) => a.name.localeCompare(b.name)),
    [assets]
  );

  const visibleAssets = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((a) => {
      return (
        a.id?.toLowerCase().includes(q) ||
        a.name?.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q) ||
        a.make?.toLowerCase().includes(q) ||
        a.model?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q) ||
        a.parentAssetName?.toLowerCase().includes(q) ||
        (a.assetId && a.assetId.toString().includes(q)) ||
        (a.parentAssetIdNumber && a.parentAssetIdNumber.toString().includes(q))
      );
    });
  }, [sorted, search]);

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
              <Search className="h-4 w-4" />
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
              <Filter className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-lg p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter chips (visual only for now) */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            <span>Type: All</span>
            <ChevronDown className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            <span>Location: All</span>
            <ChevronDown className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            <span>Status: All</span>
            <ChevronDown className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            <span>Last Maintenance</span>
            <ChevronDown className="h-3 w-3" />
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
                <th className="p-4">Asset ID</th>
                <th className="p-4">Asset Name</th>
                <th className="p-4">Parent Asset ID</th>
                <th className="p-4">Parent Asset Name</th>
                <th className="p-4">Tool Check-Out</th>
                <th className="p-4">Check-Out Approval</th>
                <th className="p-4">Default WO Template</th>
                <th className="p-4">Make</th>
                <th className="p-4">Model</th>
                <th className="p-4">Category</th>
                <th className="p-4">Location</th>
                <th className="p-4">Status</th>
                <th className="p-4">Last Maintenance</th>
                <th className="p-4">Next Maintenance</th>
                <th className="p-4">Total WOs</th>
                <th className="p-4">Open WOs</th>
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
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}


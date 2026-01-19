"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Drawer from "../../components/ui/Drawer";
import WorkOrderDetails from "../../components/workorders/WorkOrderDetails";
import CreateWorkOrderForm from "../../components/workorders/CreateWorkOrderForm";
import { Asset } from "../../lib/data/assets";
import { WorkOrder } from "../../lib/data/workOrders";
import EditWorkOrderButton from "./EditWorkOrderButton";
import ViewWorkOrderButton from "./ViewWorkOrderButton";
import DeleteWorkOrderButton from "./DeleteWorkOrderButton";
import DashboardHeader, {
  DashboardSearchItem,
} from "@/components/dashboard/DashboardHeader";

// --- Type definitions for API objects ---
interface Technician {
  id: string;
  name: string;
  email: string;
  phone?: string;
  active: boolean;
}

const statusOptions = [
  "All",
  "Open",
  "In Progress",
  "Pending Review",
  "Completed",
  "Cancelled",
] as const;
const priorityOptions = ["All", "High", "Medium", "Low"] as const;

const priorityColors: Record<string, string> = {
  High: "bg-red-100 text-red-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-gray-100 text-gray-800",
};

const statusColors: Record<string, string> = {
  Open: "bg-yellow-100 text-yellow-800",
  "In Progress": "bg-blue-100 text-blue-800",
  "Pending Review": "bg-purple-100 text-purple-800",
  Completed: "bg-green-100 text-green-800",
  Cancelled: "bg-gray-100 text-gray-700",
};

type DateInput = string | Date | null | undefined;

function formatDate(date: DateInput) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString();
}

export default function WorkOrdersPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // While the session is loading on the client, avoid making assumptions
  // about the user's role. This prevents briefly treating an admin as a
  // non-admin and ensures role-based UI (like buttons) appears reliably.
  const isSessionLoading = sessionStatus === "loading";
  const rawRole = (session?.user as any)?.role;
  const role = !isSessionLoading ? rawRole : undefined;
  const technicianId = !isSessionLoading
    ? (((session?.user as any)?.technicianId ?? null) as string | null)
    : null;
  const isAdmin = role === "ADMIN";
  const isTechnician = role === "TECHNICIAN";
  const isUser = role === "USER";
  const isMasterAdmin = role === "MASTER_ADMIN";
  const userStoreId = ((session?.user as any)?.storeId ?? null) as string | null;

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

  const [status, setStatus] =
    useState<(typeof statusOptions)[number]>("All");
  const [priority, setPriority] =
    useState<(typeof priorityOptions)[number]>("All");
  const [search, setSearch] = useState<string>("");

  const [selected, setSelected] = useState<WorkOrder | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [tableOrders, setTableOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [stores, setStores] = useState<{ id: string; name: string; code?: string | null }[]>([]);

  // Initialize filter from URL query parameter if present
  const urlFilter = searchParams?.get("filter");
  const validFilters = ["all", "open", "inProgress", "completed", "overdue"] as const;
  const initialFilter = (urlFilter && validFilters.includes(urlFilter as any)) 
    ? (urlFilter as typeof validFilters[number])
    : "all";
  
  const [filter, setFilter] = useState<
    "all" | "open" | "inProgress" | "completed" | "overdue"
  >(initialFilter);

  // Update filter when URL query parameter changes
  useEffect(() => {
    const urlFilter = searchParams?.get("filter");
    if (urlFilter && validFilters.includes(urlFilter as any)) {
      setFilter(urlFilter as typeof validFilters[number]);
    }
  }, [searchParams]);

  // 🔹 NEW: technician filter
  const [techFilter, setTechFilter] = useState<string>("all");
  // 🔹 "My Tasks" mode (focus on a single technician's active work)
  const [myTasksMode, setMyTasksMode] = useState(false);
  const [myTasksInitialized, setMyTasksInitialized] = useState(false);

  // --------- Load data ---------
  useEffect(() => {
    fetch("/api/workorders", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          console.error("Failed to fetch work orders:", res.status);
          return { data: [] };
        }
        return res.json();
      })
      .then((data) => setTableOrders(data.data || data || []))
      .catch((err) => {
        console.error("Error fetching work orders:", err);
        setTableOrders([]);
      });

    fetch("/api/assets", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          console.error("Failed to fetch assets:", res.status);
          return [];
        }
        return res.json();
      })
      .then((data) =>
        setAssets(Array.isArray(data) ? data : data.data || [])
      )
      .catch((err) => {
        console.error("Error fetching assets:", err);
        setAssets([]);
      });

    fetch("/api/technicians", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          console.error("Failed to fetch technicians:", res.status);
          return [];
        }
        return res.json();
      })
      .then((data) =>
        setTechnicians(Array.isArray(data) ? data : data.data || [])
      )
      .catch((err) => {
        console.error("Error fetching technicians:", err);
        setTechnicians([]);
      });

    // Fetch stores if master admin
    if (isMasterAdmin) {
      fetch("/api/stores", { cache: "no-store" })
        .then((res) => {
          if (!res.ok) {
            console.error("Failed to fetch stores:", res.status);
            return [];
          }
          return res.json();
        })
        .then((data) =>
          setStores(Array.isArray(data) ? data : data.data || [])
        )
        .catch((err) => {
          console.error("Error fetching stores:", err);
          setStores([]);
        });
    }
  }, [isMasterAdmin]);

  // For technicians, default My Tasks to ON (focus on active queue) once the
  // role information is available. Admins keep My Tasks off by default.
  useEffect(() => {
    if (myTasksInitialized) return;
    if (isTechnician) {
      setMyTasksMode(true);
    }
    setMyTasksInitialized(true);
  }, [isTechnician, myTasksInitialized]);

  const assetMap = Object.fromEntries(
    assets.map((a) => [a.id, a])
  ) as Record<string, Asset>;
  const techMap = Object.fromEntries(
    technicians.map((t) => [t.id, t.name])
  ) as Record<string, string>;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // --------- Role-scoped base set + filtering ---------
  // Start from all work orders returned by the API, then scope to the
  // current user's role before applying any UI filters.
  let visibleWorkOrders: WorkOrder[] = tableOrders;

  // TECHNICIAN: can only ever see their own assigned work orders.
  // ADMIN: sees all work orders.
  if (isTechnician && technicianId) {
    visibleWorkOrders = tableOrders.filter(
      (w) => w.assignedToId === technicianId
    );
  }

  // Apply filters on top of the role-scoped base set.
  let rows: WorkOrder[] = [...visibleWorkOrders];

  // Tab filter
  if (filter === "open") {
    rows = rows.filter((w) => w.status === "Open");
  } else if (filter === "inProgress") {
    rows = rows.filter((w) => w.status === "In Progress");
  } else if (filter === "completed") {
    rows = rows.filter((w) => w.status === "Completed");
  } else if (filter === "overdue") {
    rows = rows.filter((w) => {
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
    });
  }

  // Status dropdown
  if (status !== "All") {
    rows = rows.filter((w) => w.status === status);
  }

  // Priority dropdown
  if (priority !== "All") {
    rows = rows.filter((w) => w.priority === priority);
  }

  // Technician dropdown filter (ADMIN only)
  if (isAdmin && techFilter !== "all") {
    rows = rows.filter((w) => w.assignedToId === techFilter);
  }

  // Search by title or asset name
  if (search.trim().length > 0) {
    const searchLower = search.toLowerCase();
    rows = rows.filter((w) => {
      const assetName =
        w.assetId ? (assetMap[w.assetId]?.name?.toLowerCase() || "") : "";
      return (
        w.title.toLowerCase().includes(searchLower) ||
        assetName.includes(searchLower)
      );
    });
  }

  // When "My Tasks" is ON for a technician, further narrow to *active* tasks
  // (exclude Completed / Cancelled). Admins are never implicitly restricted.
  let visibleRows: WorkOrder[] = rows;
  if (myTasksMode && isTechnician && technicianId) {
    visibleRows = rows.filter(
      (w) => w.status !== "Completed" && w.status !== "Cancelled"
    );
  }

  // Sort newest first
  visibleRows.sort((a, b) => {
    const ad = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const bd = b.createdAt ? new Date(b.createdAt) : new Date(0);
    return bd.getTime() - ad.getTime();
  });

  // --- Header metrics & search items for DashboardHeader ---
  const email = ((session?.user as any)?.email as string) ?? "";

  const pendingCount = useMemo(
    () =>
      tableOrders.filter(
        (w) => w.status === "Open" || w.status === "In Progress"
      ).length,
    [tableOrders]
  );

  const overdueCount = useMemo(
    () =>
      tableOrders.filter((w) => {
        if (!w.dueDate) return false;
        const due = new Date(w.dueDate as any);
        const dueDay = new Date(
          due.getFullYear(),
          due.getMonth(),
          due.getDate()
        );
        const isCompleted =
          w.status === "Completed" || w.status === "Cancelled";
        return !isCompleted && dueDay < today;
      }).length,
    [tableOrders, today]
  );

  // We don't yet load schedules on this page; show 0 for now.
  const scheduledMaintenanceCount = 0;

  const searchItems: DashboardSearchItem[] = useMemo(
    () => [
      // Work orders
      ...tableOrders.map((w) => ({
        id: w.id,
        type: "workorder" as const,
        title: w.title,
            description: w.assetId
              ? `Asset: ${assetMap[w.assetId]?.name || w.assetId} • Status: ${w.status}`
              : `Status: ${w.status}`,
        href: `/workorders/${w.id}`,
      })),
      // Assets
      ...assets.map((a) => ({
        id: a.id,
        type: "asset" as const,
        title: a.name,
        description: a.location,
        href: `/assets/${a.id}`,
      })),
    ],
    [tableOrders, assets, assetMap]
  );

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      {/* Global-style header: search, notifications, user avatar */}
      <DashboardHeader
        email={email}
        pendingCount={pendingCount}
        overdueCount={overdueCount}
        scheduledMaintenanceCount={scheduledMaintenanceCount}
        searchItems={searchItems}
      />

      {/* Page header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Work Orders</h2>
          <p className="mt-1 text-sm text-slate-500">
            Track, filter, and manage all maintenance tasks.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isTechnician && (
            <button
              type="button"
              onClick={() => setMyTasksMode((prev) => !prev)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                myTasksMode
                  ? "bg-blue-50 text-blue-700 border border-blue-600"
                  : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
              }`}
            >
              My Tasks
            </button>
          )}
          {(isAdmin || isUser) && (
            <button
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              onClick={() => setShowCreate(true)}
            >
              <span className="text-base leading-none">+</span>
              <span>New Work Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        {/* Search */}
        <div className="relative w-full md:w-1/3">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <span className="text-sm" aria-hidden="true">
              🔍
            </span>
          </span>
          <input
            type="text"
            placeholder="Search work orders..."
            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
          {/* Status filter */}
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50"
          >
            <span>Status</span>
            <span className="text-xs" aria-hidden="true">
              ▾
            </span>
          </button>

          {/* Priority filter */}
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50"
          >
            <span>Priority</span>
            <span className="text-xs" aria-hidden="true">
              ▾
            </span>
          </button>

          {/* Technician filter (admin only) */}
          {isAdmin && (
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50"
            >
              <span>Technician</span>
              <span className="text-xs" aria-hidden="true">
                ▾
              </span>
            </button>
          )}

          {/* Date range placeholder */}
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50"
          >
            <span>Date Range</span>
            <span className="text-xs" aria-hidden="true">
              📅
            </span>
          </button>
        </div>
      </div>

      {/* Main table card */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="p-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="p-4 font-medium">Work Order</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Priority</th>
                <th className="p-4 font-medium">Assigned To</th>
                <th className="p-4 font-medium">Asset</th>
                <th className="p-4 font-medium">Due Date</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    No work orders found.
                  </td>
                </tr>
              ) : (
                visibleRows.map((w) => (
                  <tr
                    key={w.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="p-4 align-top">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-4 align-top">
                      <div className="font-medium text-slate-900">
                        {w.title}
                      </div>
                      <div className="text-xs text-slate-500">{w.id}</div>
                    </td>
                    <td className="p-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColors[w.status]}`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="p-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          priorityColors[w.priority]
                        }`}
                      >
                        {w.priority}
                      </span>
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                          {(techMap[w.assignedToId || ""] || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <span className="text-sm text-slate-800">
                          {w.assignedToId
                            ? techMap[w.assignedToId] || w.assignedToId
                            : "Unassigned"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      {w.assetId ? (assetMap[w.assetId]?.name || w.assetId) : "—"}
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      {formatDate(w.dueDate)}
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex items-center justify-end gap-2">
                        <ViewWorkOrderButton id={w.id} />
                        <EditWorkOrderButton id={w.id} />
                        {isAdmin && <DeleteWorkOrderButton id={w.id} />}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Simple footer summary */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>
            Showing{" "}
            <span className="font-medium">
              {visibleRows.length || 0}
            </span>{" "}
            of{" "}
            <span className="font-medium">
              {visibleWorkOrders.length || 0}
            </span>{" "}
            work orders
          </span>
        </div>
      </div>

      {/* Drawer for row details */}
      <Drawer open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <WorkOrderDetails
            workOrder={selected}
            asset={selected.assetId ? assetMap[selected.assetId] : undefined}
            technicianMap={techMap}
          />
        )}
      </Drawer>

      {/* Drawer for create form */}
      <Drawer open={showCreate} onClose={() => setShowCreate(false)}>
        <CreateWorkOrderForm
          onSuccess={(newWorkOrder) => {
            // Close the drawer
            setShowCreate(false);
            // Refresh table data after successful creation
            fetch("/api/workorders", { cache: "no-store" })
              .then((res) => {
                if (!res.ok) {
                  console.error("Failed to refresh work orders:", res.status);
                  return { data: [] };
                }
                return res.json();
              })
              .then((data) => setTableOrders(data.data || data || []))
              .catch((err) => {
                console.error("Error refreshing work orders:", err);
              });
          }}
          onCancel={() => setShowCreate(false)}
          isMasterAdmin={isMasterAdmin}
          stores={stores}
          currentStoreId={userStoreId}
        />
      </Drawer>
    </div>
  );
}

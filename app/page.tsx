import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Boxes,
  Clock,
  CheckCircle2,
  CalendarRange,
} from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import TechnicianDashboard from "../components/dashboard/TechnicianDashboard";

// Helper types/functions for date handling (kept internal to this file)
type DateInput = string | Date | null | undefined;

function formatDate(date: DateInput) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString();
}

function toDayKey(date: DateInput) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

const priorityColors: Record<string, string> = {
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-green-100 text-green-700",
};

const statusColors: Record<string, string> = {
  Open: "bg-orange-50 text-orange-700",
  "In Progress": "bg-blue-50 text-blue-700",
  Completed: "bg-green-50 text-green-700",
  Cancelled: "bg-gray-100 text-gray-600",
};

function getTodayKey() {
  const now = new Date();
  return toDayKey(now);
}

export default async function DashboardPage() {
  // Role-aware dashboard: derive role and technicianId from the session
  const session = await getServerSession(authOptions);

  // If there is no session at all, send the user to login rather than
  // silently treating them as a non-admin.
  if (!session) {
    redirect("/login");
  }

  const user = session.user as any;
  const email = (user?.email as string) ?? "";
  const role = user?.role;
  const technicianId = ((session.user as any)?.technicianId ?? null) as
    | string
    | null;
  const userStoreId = ((session.user as any)?.storeId ?? null) as
    | string
    | null;
  const isAdmin = role === "ADMIN";
  const isTechnician = role === "TECHNICIAN";
  const isUser = role === "USER";

  // Redirect USER role to work orders page (they don't have dashboard access)
  if (isUser) {
    redirect("/workorders");
  }

  // Get technician name if technician
  let technicianName = "";
  if (isTechnician && technicianId) {
    try {
    const technician = await prisma.technician.findUnique({
      where: { id: technicianId },
      select: { name: true },
    });
    technicianName = technician?.name || "Technician";
    } catch (error: any) {
      console.error("Error fetching technician:", error);
      // Fallback if database query fails
      technicianName = "Technician";
    }
  }

  // Get all needed data from Prisma
  let allWorkOrders: any[] = [];
  let assets: any[] = [];
  let schedules: any[] = [];

  try {
    // Build where clause for work orders based on role
    const workOrderWhere: any = {};
    if (isTechnician && technicianId) {
      // Technicians: only work orders assigned to them
      workOrderWhere.assignedToId = technicianId;
    } else if (isUser && userStoreId) {
      // USER: only work orders from their store
      workOrderWhere.storeId = userStoreId;
    }
    // ADMIN: no filter (sees all work orders)

    // Build where clause for assets based on role
    const assetWhere: any = {};
    if (isUser && userStoreId) {
      assetWhere.storeId = userStoreId;
    }

    // Use Promise.allSettled to prevent one failing query from blocking others
    const results = await Promise.allSettled([
      prisma.workOrder.findMany({
        where: workOrderWhere,
        orderBy: { createdAt: "desc" },
        include: {
          asset: {
            select: { name: true },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.asset.findMany({
        where: assetWhere,
        orderBy: { name: "asc" },
      }),
      prisma.preventiveSchedule.findMany({
        take: 100, // Limit to prevent large queries
      }),
    ]);

    // Extract results, using empty arrays if any query failed
    allWorkOrders = results[0].status === "fulfilled" ? results[0].value : [];
    assets = results[1].status === "fulfilled" ? results[1].value : [];
    schedules = results[2].status === "fulfilled" ? results[2].value : [];
  } catch (error: any) {
    console.error("Error fetching dashboard data:", error);
    // If database connection fails, show empty data rather than crashing
    // The UI will show empty states
  }

  // Role-scoped work orders:
  // - ADMIN: all work orders (already filtered by workOrderWhere = {})
  // - TECHNICIAN: only work orders assigned to this technician (already filtered by workOrderWhere)
  // - USER: only work orders from their store (already filtered by workOrderWhere)
  // Note: Filtering is now done at the database level for better performance
  let visibleWorkOrders = allWorkOrders;

  // Asset ID to name
  const assetMap = Object.fromEntries(
    assets.map((a: any) => [a.id, a.name])
  );

  // KPIs are based on role-aware `visibleWorkOrders`
  const kpiOpen = visibleWorkOrders.filter(
    (w: any) => w.status === "Open"
  ).length;
  const kpiInProgress = visibleWorkOrders.filter(
    (w: any) => w.status === "In Progress"
  ).length;

  const todayKey = getTodayKey();
  const kpiCompletedToday = visibleWorkOrders.filter(
    (w: any) =>
      w.status === "Completed" &&
      w.completedAt &&
      toDayKey(w.completedAt) === todayKey
  ).length;

  const now = new Date();

  const kpiOverdue = visibleWorkOrders.filter((w: any) => {
    if (!w.dueDate) return false;

    const due = new Date(w.dueDate);
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const dueDay = new Date(
      due.getFullYear(),
      due.getMonth(),
      due.getDate()
    );

    const isCompleted =
      w.status === "Completed" || w.status === "Cancelled";

    return !isCompleted && dueDay < today;
  }).length;

  const kpiCompleted = visibleWorkOrders.filter(
    (w: any) => w.status === "Completed"
  ).length;

  const scheduledMaintenanceCount = schedules.filter(
    (s: any) => s.active
  ).length;

  // Upcoming maintenance: next few active preventive schedules
  const upcomingMaintenances = schedules
    .filter((s: any) => s.active && s.nextDueDate)
    .sort(
      (a: any, b: any) =>
        new Date(a.nextDueDate).getTime() -
        new Date(b.nextDueDate).getTime()
    )
    .slice(0, 3);

  // Recent work orders (top 5) from role-aware set
  const recent = [...visibleWorkOrders]
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  // Chart: Build trendData (last 14 days) from the same role-aware `visibleWorkOrders`
  const chartSource = visibleWorkOrders as any[];

  const days = [...Array(14)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = toDayKey(d);
    return {
      date: key,
      label: d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      createdCount: 0,
      completedCount: 0,
    };
  });

  const trendMap: Record<string, (typeof days)[0]> = Object.fromEntries(
    days.map((pt) => [pt.date, { ...pt }])
  );

  for (const w of chartSource) {
    // By createdAt
    const createdKey = toDayKey(w.createdAt);
    if (trendMap[createdKey]) trendMap[createdKey].createdCount++;

    // By completedAt (only if completed)
    if (w.status === "Completed" && w.completedAt) {
      const completedKey = toDayKey(w.completedAt);
      if (trendMap[completedKey])
        trendMap[completedKey].completedCount++;
    }
  }

  const trendData = Object.values(trendMap);

  const formattedDate = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const hour = now.getHours();
  const greetingPrefix =
    hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  const displayName =
    user?.name ??
    (role === "ADMIN" ? "Admin" : role === "TECHNICIAN" ? "Technician" : "User");

  // Work order status numbers for the donut + legend
  const donutPending = kpiOpen;
  const donutOverdue = kpiOverdue;
  const donutInProgress = kpiInProgress;
  const donutCompleted = kpiCompleted;

  const donutTotal =
    donutPending + donutOverdue + donutCompleted + donutInProgress;

  let donutGradient = "conic-gradient(#e5e7eb 0% 100%)"; // gray fallback

  if (donutTotal > 0) {
    const segments = [
      { color: "#F59E0B", value: donutPending }, // yellow
      { color: "#EF4444", value: donutOverdue }, // red
      { color: "#10B981", value: donutCompleted }, // green
      { color: "#3B82F6", value: donutInProgress }, // blue
    ];

    let current = 0;
    const parts: string[] = [];

    for (const seg of segments) {
      const start = current;
      const end = current + (seg.value / donutTotal) * 100;
      parts.push(`${seg.color} ${start}% ${end}%`);
      current = end;
    }

    donutGradient = `conic-gradient(${parts.join(", ")})`;
  }

  // Maintenance trend: last 7 days based on created work orders
  const last7 = trendData.slice(-7);
  const maxCreated =
    last7.length > 0
      ? Math.max(...last7.map((d) => d.createdCount || 0))
      : 0;

  // Build search index for the dashboard header (work orders + assets + PM)
  const searchItems =
    visibleWorkOrders.length === 0 && assets.length === 0 && schedules.length === 0
      ? []
      : [
          // Work orders
          ...visibleWorkOrders.map((w: any) => ({
            id: w.id,
            type: "workorder" as const,
            title: w.title,
            description: `Asset: ${
              assetMap[w.assetId] || w.assetId
            } • Status: ${w.status}`,
            href: `/workorders/${w.id}`,
          })),
          // Assets
          ...assets.map((a: any) => ({
            id: a.id,
            type: "asset" as const,
            title: a.name,
            description: (a as any).location,
            href: `/assets/${a.id}`,
          })),
          // Preventive maintenance schedules
          ...schedules.map((pm: any) => ({
            id: pm.id,
            type: "maintenance" as const,
            title: pm.title,
            description: `Asset: ${
              assetMap[pm.assetId] || pm.assetId
            }`,
            href: `/pm/${pm.id}`,
          })),
        ];

  // Render technician dashboard if user is a technician
  if (isTechnician) {
    return (
      <div className="p-8">
        <TechnicianDashboard
          technicianName={technicianName || "Technician"}
          workOrders={visibleWorkOrders.map((wo: any) => ({
            id: wo.id,
            title: wo.title,
            priority: wo.priority,
            status: wo.status,
            dueDate: wo.dueDate,
            asset: wo.asset,
            createdAt: wo.createdAt,
            completedAt: wo.completedAt,
          }))}
        />
      </div>
    );
  }

  // Render admin dashboard
  return (
    <div className="space-y-8">
      {/* Dashboard header: search, new work order, notifications, user menu */}
      <DashboardHeader
        email={email}
        pendingCount={kpiOpen + kpiInProgress}
        overdueCount={kpiOverdue}
        scheduledMaintenanceCount={scheduledMaintenanceCount}
        searchItems={searchItems}
      />

      {/* Date + greeting */}
      <div>
        <p className="text-sm text-slate-500">{formattedDate}</p>
        <h2 className="mt-1 text-3xl font-bold text-slate-900">
          {greetingPrefix}! {displayName},
        </h2>
      </div>

      {/* KPI pill strip (Total Assets, Pending, Completed, Scheduled) */}
      <div className="bg-white rounded-full shadow-sm flex flex-col items-stretch gap-4 p-4 md:flex-row md:items-center md:justify-around">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <Boxes className="h-4 w-4" />
          </span>
          <span className="text-lg font-bold">{assets.length}</span>
          <span className="text-sm text-slate-500">Total Assets</span>
        </div>

        <div className="hidden h-8 w-px bg-slate-200 md:block" />

        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Clock className="h-4 w-4" />
          </span>
          <span className="text-lg font-bold">
            {kpiOpen + kpiInProgress}
          </span>
          <span className="text-sm text-slate-500">Pending Work Orders</span>
        </div>

        <div className="hidden h-8 w-px bg-slate-200 md:block" />

        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <span className="text-lg font-bold">{kpiCompleted}</span>
          <span className="text-sm text-slate-500">
            Completed Work Orders
          </span>
        </div>

        <div className="hidden h-8 w-px bg-slate-200 md:block" />

        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <CalendarRange className="h-4 w-4" />
          </span>
          <span className="text-lg font-bold">
            {scheduledMaintenanceCount}
          </span>
          <span className="text-sm text-slate-500">
            Scheduled Maintenance
          </span>
        </div>
      </div>

      {/* Status + Upcoming Maintenance */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Work Order Status with donut chart */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">
              Work Order Status
            </h3>
            <button className="text-sm font-medium text-slate-500 hover:text-indigo-600">
              This Week
              <span className="ml-1 align-middle text-xs">&#9662;</span>
            </button>
          </div>
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="relative flex-shrink-0 mx-auto md:mx-0">
              <div
                className="relative h-36 w-36 rounded-full"
                style={{ backgroundImage: donutGradient }}
              >
                <div className="absolute inset-4 rounded-full bg-white" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-slate-900">
                    {donutTotal}
                  </span>
                  <span className="text-sm text-slate-500">in total</span>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span>Pending</span>
                </div>
                <span className="font-medium">{donutPending}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  <span>Overdue</span>
                </div>
                <span className="font-medium">{donutOverdue}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span>Completed</span>
                </div>
                <span className="font-medium">{donutCompleted}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-500" />
                  <span>In Progress</span>
                </div>
                <span className="font-medium">{donutInProgress}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Maintenance Schedules */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">
              Upcoming Maintenance Schedules
            </h3>
            <Link
              href="/schedules"
              className="text-sm font-medium text-slate-500 hover:text-indigo-600"
            >
              View all
            </Link>
          </div>
          {upcomingMaintenances.length === 0 ? (
            <p className="text-sm text-slate-500">
              No upcoming preventive maintenance scheduled.
            </p>
          ) : (
            <div className="space-y-4">
              {upcomingMaintenances.map((pm: any) => {
                const d = new Date(pm.nextDueDate);
                const weekday = d.toLocaleDateString(undefined, {
                  weekday: "short",
                });
                const day = d.getDate();

                return (
                  <div key={pm.id} className="flex items-start gap-4">
                    <div className="w-12 flex-shrink-0 text-center">
                      <p className="text-xs uppercase text-slate-500">
                        {weekday}
                      </p>
                      <p className="text-lg font-bold text-slate-800">{day}</p>
                    </div>
                    <div className="border-l-2 border-orange-500 pl-4">
                      <p className="font-medium text-slate-800">{pm.title}</p>
                      <p className="text-xs text-slate-500">
                        Asset: {assetMap[pm.assetId] || pm.assetId}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Every {pm.frequencyDays} days
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activities table */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            Recent Activities
          </h3>
          <Link
            href="/workorders"
            className="text-sm font-medium text-slate-500 hover:text-indigo-600"
          >
            See All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-2 py-3 font-medium">Task / Asset</th>
                <th className="px-2 py-3 font-medium">Assigned To</th>
                <th className="px-2 py-3 font-medium">Status</th>
                <th className="px-2 py-3 font-medium">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-2 py-6 text-center text-slate-400"
                  >
                    No recent activities.
                  </td>
                </tr>
              ) : (
                recent.map((w: any) => (
                  <tr
                    key={w.id}
                    className="border-b border-slate-200 last:border-0"
                  >
                    <td className="px-2 py-4 font-medium text-slate-900">
                      {w.title}
                    </td>
                    <td className="px-2 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                          {(w?.assignedToName || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <span className="text-slate-700">
                          {w?.assignedToName || "Unassigned"}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          w.status === "Completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : w.status === "Open"
                            ? "bg-amber-100 text-amber-800"
                            : w.status === "In Progress"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="px-2 py-4 text-slate-500">
                      {formatDate(w.dueDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

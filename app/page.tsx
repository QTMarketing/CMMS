import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import TechnicianDashboard from "../components/dashboard/TechnicianDashboard";
import ClickableStatusDonut from "../components/dashboard/ClickableStatusDonut";

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
  const technicianId = ((session.user as any)?.vendorId ?? null) as
    | string
    | null;
  const userStoreId = ((session.user as any)?.storeId ?? null) as
    | string
    | null;
  const isAdmin = role === "ADMIN";
  const isTechnician = role === "VENDOR";
  const isUser = role === "USER";
  const isStoreAdmin = role === "STORE_ADMIN";

  // Redirect USER role to work orders page (they don't have dashboard access)
  // STORE_ADMIN can access dashboard
  if (isUser) {
    redirect("/workorders");
  }

  // Get vendor name if vendor
  let technicianName = "";
  if (isTechnician && technicianId) {
    try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: technicianId },
      select: { name: true },
    });
    technicianName = vendor?.name || "Vendor";
    } catch (error: any) {
      console.error("Error fetching vendor:", error);
      technicianName = "Vendor";
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
          store: {
            select: {
              id: true,
              name: true,
              code: true,
              address: true,
              city: true,
              state: true,
              zipCode: true,
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
            description: w.assetId
              ? `Asset: ${assetMap[w.assetId] || w.assetId} • Status: ${w.status}`
              : `Status: ${w.status}`,
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

      {/* KPI pill strip (Open Work Orders, Pending, Completed, Scheduled) */}
      <div className="bg-white rounded-full shadow-sm flex flex-col items-stretch gap-4 p-4 md:flex-row md:items-center md:justify-around">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <span className="text-xs font-semibold">O</span>
          </span>
          <span className="text-lg font-bold">{kpiOpen}</span>
          <span className="text-sm text-slate-500">Open Work Orders</span>
        </div>

        <div className="hidden h-8 w-px bg-slate-200 md:block" />

        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <span className="text-xs font-semibold">P</span>
          </span>
          <span className="text-lg font-bold">
            {kpiOpen + kpiInProgress}
          </span>
          <span className="text-sm text-slate-500">Pending Work Orders</span>
        </div>

        <div className="hidden h-8 w-px bg-slate-200 md:block" />

        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <span className="text-xs font-semibold">C</span>
          </span>
          <span className="text-lg font-bold">{kpiCompleted}</span>
          <span className="text-sm text-slate-500">
            Completed Work Orders
          </span>
        </div>

        <div className="hidden h-8 w-px bg-slate-200 md:block" />

        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <span className="text-xs font-semibold">S</span>
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
          <ClickableStatusDonut
            pending={donutPending}
            overdue={donutOverdue}
            completed={donutCompleted}
            inProgress={donutInProgress}
            total={donutTotal}
          />
        </div>

        {/* Upcoming Maintenance Schedules */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">
              Upcoming Maintenance Schedules
            </h3>
            <Link
              href="/pm"
              className="text-sm font-medium text-slate-500 hover:text-indigo-600"
            >
              View all preventive schedules
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

    </div>
  );
}

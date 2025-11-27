import { prisma } from "@/lib/prisma";
import KpiCard from "../components/dashboard/KpiCard";
import WorkOrderTrendChart from "../components/dashboard/WorkOrderTrendChart";
import Table from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

// Helper types/functions for date handling
export type DateInput = string | Date | null | undefined;

export function formatDate(date: DateInput) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString();
}

export function toDayKey(date: DateInput) {
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

  const role = (session.user as any)?.role;
  const technicianId = ((session.user as any)?.technicianId ?? null) as
    | string
    | null;
  const isAdmin = role === "ADMIN";
  const isTechnician = role === "TECHNICIAN";

  // Get all needed data from Prisma
  const [allWorkOrders, assets] = await Promise.all([
    prisma.workOrder.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.asset.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Role-scoped work orders:
  // - ADMIN: all work orders
  // - TECHNICIAN: only work orders assigned to this technician
  let visibleWorkOrders = allWorkOrders;

  if (isTechnician && technicianId) {
    visibleWorkOrders = allWorkOrders.filter(
      (w: any) => w.assignedToId === technicianId
    );
  }

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

  // Render
  return (
    <div className="flex flex-col gap-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
        <KpiCard title="Open Work Orders" value={kpiOpen} />
        <KpiCard title="In Progress" value={kpiInProgress} />
        <KpiCard title="Completed Today" value={kpiCompletedToday} />
        <KpiCard title="Overdue" value={kpiOverdue} />
      </div>

      {/* Work Order Chart */}
      <div className="w-full p-4 md:p-6 min-h-[300px]">
        <WorkOrderTrendChart data={trendData} />
      </div>

      {/* Recent Work Orders */}
      <Table
        headers={["ID", "Title", "Asset", "Priority", "Status", "Due Date"]}
        textSizeClass="text-xs sm:text-sm"
      >
        {recent.map((w) => (
          <tr key={w.id}>
            <td className="px-4 py-2 font-mono whitespace-nowrap">
              {w.id}
            </td>
            <td className="px-4 py-2 whitespace-nowrap">{w.title}</td>
            <td className="px-4 py-2 whitespace-nowrap">
              {assetMap[w.assetId] || w.assetId}
            </td>
            <td className="px-4 py-2">
              <Badge colorClass={priorityColors[w.priority]}>
                {w.priority}
              </Badge>
            </td>
            <td className="px-4 py-2">
              <Badge colorClass={statusColors[w.status]}>
                {w.status}
              </Badge>
            </td>
            <td className="px-4 py-2 whitespace-nowrap">
              {formatDate(w.dueDate)}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

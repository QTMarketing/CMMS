import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";
import TransferHistory from "@/components/transfers/TransferHistory";

type PageProps = {
  params: Promise<{ id: string }>;
};

type DateInput = string | Date | null | undefined;

function formatDate(date: DateInput) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString();
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

const pmStatusColors: Record<
  "on-track" | "due-soon" | "overdue" | "inactive",
  string
> = {
  "on-track": "bg-green-50 text-green-700",
  "due-soon": "bg-amber-50 text-amber-700",
  overdue: "bg-red-50 text-red-700",
  inactive: "bg-gray-100 text-gray-600",
};

const PM_SOON_THRESHOLD_DAYS = 7;

function getPmStatus(schedule: any): "on-track" | "due-soon" | "overdue" | "inactive" {
  if (!schedule.active) return "inactive";
  if (!schedule.nextDueDate) return "inactive";

  const now = new Date();
  const due = new Date(schedule.nextDueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return "overdue";
  if (diffDays <= PM_SOON_THRESHOLD_DAYS) return "due-soon";
  return "on-track";
}

export default async function AssetHistoryPage({ params }: PageProps) {
  const { id } = await params;

  // Derive role so we can conditionally show PM schedule data only to admins.
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const role = (session?.user as any)?.role;
  const isAdmin = isAdminLike(role);
  const isTechnician = role === "TECHNICIAN";

  // Redirect technicians away from asset detail pages
  if (isTechnician) {
    redirect("/");
  }

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  if (!asset) {
    // If the asset doesn't exist, surface a proper 404 page
    return notFound();
  }

  // Work orders for this asset
  const workOrders = await prisma.workOrder.findMany({
    where: { assetId: id },
    include: { assignedTo: true },
    orderBy: { createdAt: "desc" },
  });

  // Preventive maintenance schedules for this asset
  const pmSchedules = await prisma.preventiveSchedule.findMany({
    where: { assetId: id },
    orderBy: { nextDueDate: "asc" },
  });

  const total = workOrders.length;
  const openCount = workOrders.filter((w) => w.status === "Open").length;
  const inProgressCount = workOrders.filter(
    (w) => w.status === "In Progress"
  ).length;
  const completedCount = workOrders.filter(
    (w) => w.status === "Completed"
  ).length;

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">{asset.name}</h1>
          <p className="text-xs text-gray-400 mt-1">Asset ID: {asset.id}</p>
        </div>
        <Link
          href="/assets"
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Back to assets"
        >
          ×
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
        <div className="bg-white rounded-xl w-full p-4 sm:p-6 shadow-sm flex flex-col items-start mb-2 sm:mb-0">
          <div className="text-sm text-gray-600">Total Work Orders</div>
          <div className="text-3xl font-bold mt-2 text-orange-600">
            {total}
          </div>
        </div>
        <div className="bg-white rounded-xl w-full p-4 sm:p-6 shadow-sm flex flex-col items-start mb-2 sm:mb-0">
          <div className="text-sm text-gray-600">Open</div>
          <div className="text-3xl font-bold mt-2 text-orange-600">
            {openCount}
          </div>
        </div>
        <div className="bg-white rounded-xl w-full p-4 sm:p-6 shadow-sm flex flex-col items-start mb-2 sm:mb-0">
          <div className="text-sm text-gray-600">In Progress</div>
          <div className="text-3xl font-bold mt-2 text-orange-600">
            {inProgressCount}
          </div>
        </div>
        <div className="bg-white rounded-xl w-full p-4 sm:p-6 shadow-sm flex flex-col items-start mb-2 sm:mb-0">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-3xl font-bold mt-2 text-orange-600">
            {completedCount}
          </div>
        </div>
      </div>

      {/* Preventive Maintenance section (ADMIN-only) */}
      {isAdmin && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium text-gray-700 text-base md:text-lg">
              Preventive Maintenance
            </div>
          </div>
          {pmSchedules.length === 0 ? (
            <div className="text-xs text-gray-400">
              No preventive maintenance schedules are configured for this asset yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pmSchedules.map((s) => {
                const status = getPmStatus(s);
                const statusLabel =
                  status === "overdue"
                    ? "Overdue"
                    : status === "due-soon"
                    ? "Due soon"
                    : status === "on-track"
                    ? "On track"
                    : "Inactive";

                return (
                  <div
                    key={s.id}
                    className="border border-gray-100 rounded-lg px-3 py-2.5 flex flex-col gap-1 text-xs sm:text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-gray-800">
                        <Link
                          href={`/pm/${s.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {s.title}
                        </Link>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${pmStatusColors[status]}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600">
                      <div>
                        <span className="font-medium">Frequency:</span>{" "}
                        Every {s.frequencyDays} days
                      </div>
                      <div>
                        <span className="font-medium">Next Due:</span>{" "}
                        {formatDate(s.nextDueDate)}
                      </div>
                      <div>
                        <span className="font-medium">Last Completed:</span>{" "}
                        {/* No dedicated last-completed field yet; show placeholder */}
                        —
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Transfer History */}
      {isAdmin && (
        <TransferHistory
          assetId={asset.id}
          storeId={asset.storeId}
          canTransfer={isAdmin}
        />
      )}

      {/* Work Order History */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm w-full overflow-x-auto px-2 sm:px-0">
        <table className="min-w-[700px] sm:min-w-full min-w-0 w-full text-xs sm:text-sm">
          <thead>
            <tr>
              <th className="text-left px-4 py-2 font-semibold text-gray-700">
                Work Order
              </th>
              <th className="text-left px-4 py-2 font-semibold text-gray-700">
                Status
              </th>
              <th className="text-left px-4 py-2 font-semibold text-gray-700">
                Priority
              </th>
              <th className="text-left px-4 py-2 font-semibold text-gray-700">
                Assigned To
              </th>
              <th className="text-left px-4 py-2 font-semibold text-gray-700">
                Created
              </th>
              <th className="text-left px-4 py-2 font-semibold text-gray-700">
                Due
              </th>
              <th className="text-left px-4 py-2 font-semibold text-gray-700">
                Completed
              </th>
            </tr>
          </thead>
          <tbody>
            {workOrders.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-6 text-center text-gray-400 text-xs"
                >
                  No work orders found for this asset yet.
                </td>
              </tr>
            ) : (
              workOrders.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">
                    <Link
                      href={`/workorders/${w.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      <span className="font-medium">{w.title}</span>
                      <span className="ml-1 text-xs text-gray-400">
                        ({w.id})
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusColors[w.status]}`}
                    >
                      {w.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${priorityColors[w.priority]}`}
                    >
                      {w.priority}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {w.assignedTo?.name || "Unassigned"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {formatDate(w.createdAt)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {formatDate(w.dueDate)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {formatDate(w.completedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


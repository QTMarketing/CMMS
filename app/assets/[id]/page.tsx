import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

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

export default async function AssetHistoryPage({ params }: PageProps) {
  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
  });

  if (!asset) {
    // If the asset doesn't exist, surface a proper 404 page
    return notFound();
  }

  // BUGFIX: ensure we fetch work orders by assetId (not by work order id
  // or from in-memory data), so this list matches the counts shown on /assets.
  const workOrders = await prisma.workOrder.findMany({
    where: { assetId: id },
    include: { assignedTo: true },
    orderBy: { createdAt: "desc" },
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



import type { Asset } from "@/lib/data/assets";
import type { WorkOrder } from "@/lib/data/workOrders";
import Badge from "../ui/Badge";

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Down: "bg-orange-100 text-orange-700",
  Retired: "bg-gray-100 text-gray-600",
};

const priorityColors: Record<string, string> = {
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-green-100 text-green-700",
};
const woStatusColors: Record<string, string> = {
  Open: "bg-orange-50 text-orange-700",
  "In Progress": "bg-blue-50 text-blue-700",
  Completed: "bg-green-50 text-green-700",
  Cancelled: "bg-gray-100 text-gray-600",
};

type DateInput = string | Date | null | undefined;

function formatDate(date: DateInput) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString();
}

export default function AssetDetails({
  asset,
  workOrders,
}: {
  asset: Asset;
  workOrders: WorkOrder[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="mb-2">
        <div className="text-lg font-bold">{asset.name}</div>
        <div className="text-xs text-gray-400">Asset ID: {asset.id}</div>
      </div>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <dt className="text-gray-500">Location</dt>
        <dd>{asset.location}</dd>
        <dt className="text-gray-500">Status</dt>
        <dd><Badge colorClass={statusColors[asset.status]}>{asset.status}</Badge></dd>
        <dt className="text-gray-500">Last Maintenance</dt>
        <dd>{formatDate(asset.lastMaintenanceDate)}</dd>
        <dt className="text-gray-500">Next Maintenance</dt>
        <dd>{formatDate(asset.nextMaintenanceDate)}</dd>
      </dl>
      <div className="mt-6">
        <div className="font-medium text-gray-400 uppercase text-xs mb-2 tracking-wider">Work Orders</div>
        {workOrders.length === 0 ? (
          <div className="text-gray-300 italic text-sm">No work orders found for this asset.</div>
        ) : (
          <table className="w-full rounded overflow-hidden text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="px-3 py-1">ID</th>
                <th className="px-3 py-1">Title</th>
                <th className="px-3 py-1">Priority</th>
                <th className="px-3 py-1">Status</th>
                <th className="px-3 py-1">Due</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((wo) => (
                <tr key={wo.id}>
                  <td className="px-3 py-1 font-mono">{wo.id}</td>
                  <td className="px-3 py-1">{wo.title}</td>
                  <td className="px-3 py-1">
                    <Badge colorClass={priorityColors[wo.priority]}>{wo.priority}</Badge>
                  </td>
                  <td className="px-3 py-1">
                    <Badge colorClass={woStatusColors[wo.status]}>{wo.status}</Badge>
                  </td>
                  <td className="px-3 py-1">{formatDate(wo.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";

export default function WorkOrderDetails({
  workOrder,
  asset,
  technicianMap = {},
}: {
  workOrder: any; // can be replaced with your real WorkOrder type
  asset?: any;
  technicianMap?: Record<string, string>;
}) {
  // Resolve assigned technician name
  const assignedToName =
    (workOrder.assignedTo?.name ||
      (workOrder.assignedToId && technicianMap[workOrder.assignedToId]) ||
      workOrder.assignedToId) ?? "—";

  type ActivityEvent = {
    timestamp: Date;
    label: string;
    type: "created" | "completed" | "note";
  };

  const events: ActivityEvent[] = [];

  if (workOrder.createdAt) {
    events.push({
      type: "created",
      timestamp: new Date(workOrder.createdAt),
      label: "Work order created",
    });
  }

  if (workOrder.completedAt) {
    events.push({
      type: "completed",
      timestamp: new Date(workOrder.completedAt),
      label: "Marked as completed",
    });
  }

  if (workOrder.notes && Array.isArray(workOrder.notes)) {
    for (const note of workOrder.notes) {
      if (!note.timestamp) continue;
      events.push({
        type: "note",
        timestamp: new Date(note.timestamp),
        label: `Note by ${note.author || "System"}: ${note.text}`,
      });
    }
  }

  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return (
    <div className="flex flex-col space-y-3 sm:gap-3 text-sm">
      {/* Header + Edit button */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-bold text-base md:text-lg">
            {workOrder.title}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Work Order ID: {workOrder.id}
          </div>
        </div>

        <Link
          href={`/workorders/${workOrder.id}/edit`}
          className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Edit Work Order
        </Link>
      </div>

      {/* Main details */}
      <dl className="grid grid-cols-2 gap-y-3 gap-x-4 sm:gap-x-8">
        <dt className="font-medium text-gray-500">Status</dt>
        <dd>
          <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-orange-50 text-orange-700 capitalize">
            {workOrder.status}
          </span>
        </dd>

        <dt className="font-medium text-gray-500">Priority</dt>
        <dd>
          <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-yellow-50 text-yellow-700 capitalize">
            {workOrder.priority}
          </span>
        </dd>

        <dt className="font-medium text-gray-500">Assigned To</dt>
        <dd>{assignedToName}</dd>

        <dt className="font-medium text-gray-500">Created</dt>
        <dd>
          {workOrder.createdAt
            ? new Date(workOrder.createdAt).toLocaleDateString()
            : "—"}
        </dd>

        <dt className="font-medium text-gray-500">Due Date</dt>
        <dd>
          {workOrder.dueDate
            ? new Date(workOrder.dueDate).toLocaleDateString()
            : "—"}
        </dd>

        <dt className="font-medium text-gray-500">Completed At</dt>
        <dd>
          {workOrder.completedAt
            ? new Date(workOrder.completedAt).toLocaleDateString()
            : "—"}
        </dd>

        <dt className="font-medium text-gray-500">Description</dt>
        <dd className="col-span-1 md:col-span-2">
          <span className="whitespace-pre-line">
            {workOrder.description ?? "—"}
          </span>
        </dd>
      </dl>

      {/* Activity Log (replaces Notes) */}
      <div className="mt-8">
        <div className="font-medium text-gray-500 mb-2 text-base md:text-lg">
          Activity
        </div>
        {events.length === 0 ? (
          <div className="text-gray-300 text-xs">No activity yet.</div>
        ) : (
          <div className="flex flex-col gap-3 mb-4">
            {events.map((event, idx) => (
              <div
                key={idx}
                className="bg-gray-50 border rounded px-3 py-2 text-xs sm:text-sm"
              >
                <div className="mb-1 text-xs text-gray-400 flex justify-between">
                  <span>
                    {event.type === "created"
                      ? "System"
                      : event.type === "completed"
                      ? "System"
                      : ""}
                  </span>
                  <span>{event.timestamp.toLocaleString()}</span>
                </div>
                <div>{event.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Asset summary */}
      {asset && (
        <div className="mt-5">
          <div className="font-medium text-gray-400 uppercase text-xs mb-2 tracking-wider">
            Asset
          </div>
          <dl className="grid grid-cols-2 gap-y-2 gap-x-4 md:gap-x-8 text-xs sm:text-sm">
            <dt className="text-gray-500">Asset Name</dt>
            <dd>{asset.name}</dd>

            <dt className="text-gray-500">Location</dt>
            <dd>{asset.location}</dd>

            <dt className="text-gray-500">Status</dt>
            <dd>{asset.status}</dd>

            <dt className="text-gray-500">Last Maint.</dt>
            <dd>{asset.lastMaintenanceDate || "—"}</dd>

            <dt className="text-gray-500">Next Maint.</dt>
            <dd>{asset.nextMaintenanceDate || "—"}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}


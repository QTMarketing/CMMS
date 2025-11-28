import Link from "next/link";

export default function WorkOrderDetails({
  workOrder,
  asset,
  technicianMap = {},
  isAdmin = false,
}: {
  workOrder: any; // can be replaced with your real WorkOrder type
  asset?: any;
  technicianMap?: Record<string, string>;
  isAdmin?: boolean;
}) {
  const title: string = workOrder.title ?? "";
  const isPm = title.startsWith("PM:");
  const isRequest = title.startsWith("Request:");
  const isManual = !isPm && !isRequest;

  // Resolve assigned technician name
  const assignedToName =
    (workOrder.assignedTo?.name ||
      (workOrder.assignedToId && technicianMap[workOrder.assignedToId]) ||
      workOrder.assignedToId) ?? "—";

  // Unified activity timeline: created, completed, and notes
  type ActivityItem =
    | { type: "created"; timestamp: Date }
    | { type: "completed"; timestamp: Date }
    | { type: "note"; timestamp: Date; text: string; author?: string | null };

  const activityItems: ActivityItem[] = [];

  if (workOrder.createdAt) {
    activityItems.push({
      type: "created",
      timestamp: new Date(workOrder.createdAt),
    });
  }

  if (workOrder.completedAt) {
    activityItems.push({
      type: "completed",
      timestamp: new Date(workOrder.completedAt),
    });
  }

  if (workOrder.notes && Array.isArray(workOrder.notes)) {
    for (const note of workOrder.notes) {
      if (!note.timestamp) continue;
      activityItems.push({
        type: "note",
        timestamp: new Date(note.timestamp),
        text: note.text,
        author: note.author ?? undefined,
      });
    }
  }

  // Sort newest -> oldest for quick scanning
  activityItems.sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  return (
    <div className="flex flex-col space-y-3 sm:gap-3 text-sm">
      {/* Header + Edit button */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            {workOrder.title}
            {isPm && (
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                Preventive Maintenance
              </span>
            )}
            {isRequest && (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                From Request
              </span>
            )}
            {isManual && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                Manual
              </span>
            )}
          </h1>
          <div className="text-xs text-gray-400 mt-1">
            Work Order ID: {workOrder.id}
          </div>
        </div>

        {isAdmin && (
          <Link
            href={`/workorders/${workOrder.id}/edit`}
            className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Edit Work Order
          </Link>
        )}
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

      {/* Activity timeline (replaces simple list) */}
      <div className="mt-8">
        <div className="font-medium text-gray-500 mb-2 text-base md:text-lg">
          Activity
        </div>
        {activityItems.length === 0 ? (
          <div className="text-gray-300 text-xs">No activity yet.</div>
        ) : (
          <div className="flex flex-col gap-4 mb-4">
            {activityItems.map((item, idx) => {
              const isLast = idx === activityItems.length - 1;
              const isNote = item.type === "note";
              const authorLabel =
                item.type === "note"
                  ? (item.author ? `By ${item.author}` : "By System")
                  : "System";

              const title =
                item.type === "created"
                  ? "Work order created"
                  : item.type === "completed"
                  ? "Marked as completed"
                  : "Note";

              const body =
                item.type === "note" ? item.text : undefined;

              return (
                <div key={idx} className="flex gap-3 text-xs sm:text-sm">
                  {/* Timeline rail */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        item.type === "note"
                          ? "bg-gray-400"
                          : "bg-blue-500"
                      }`}
                    />
                    {!isLast && (
                      <div className="flex-1 w-px bg-gray-200 mt-1" />
                    )}
                  </div>

                  {/* Event content */}
                  <div className="flex-1">
                    <div className="flex justify-between gap-2 mb-0.5">
                      <div className="font-medium text-gray-800">
                        {title}
                      </div>
                      <div className="text-[11px] text-gray-400 whitespace-nowrap">
                        {item.timestamp.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-500 mb-0.5">
                      {authorLabel}
                    </div>
                    {isNote && body && (
                      <div className="mt-0.5 text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded px-2 py-1">
                        {body}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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


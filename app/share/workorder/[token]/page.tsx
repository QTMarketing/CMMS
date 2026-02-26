import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import WorkOrderDetails from "@/components/workorders/WorkOrderDetails";

type PageParams = {
  params: Promise<{
    token: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function SharedWorkOrderPage({ params }: PageParams) {
  const { token } = await params;

  // Find work order by share token
  const workOrder = await prisma.workOrder.findUnique({
    where: { shareToken: token },
    include: {
      asset: true,
      assignedTo: true,
      notes: true,
      createdBy: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!workOrder) {
    notFound();
  }

  // Build technician map for the detail component
  const technicians = await prisma.vendor.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const technicianMap = Object.fromEntries(
    technicians.map((t) => [t.id, t.name])
  ) as Record<string, string>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Public header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Shared Work Order
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                This is a read-only view of the work order
              </p>
            </div>
            <div className="text-xs text-slate-500">
              {(() => {
                const num = (workOrder as any).workOrderNumber as
                  | number
                  | null
                  | undefined;
                const display =
                  typeof num === "number" && Number.isFinite(num) && num > 0
                    ? String(num).padStart(4, "0")
                    : String(workOrder.id);
                return `Work Order #${display}`;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Work order details */}
      <div className="max-w-7xl mx-auto px-4 py-4 md:px-8 md:py-6">
        <div className="space-y-4 text-sm">
          {/* Header */}
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 md:text-xl">
                {workOrder.title}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {(() => {
                  const num = (workOrder as any).workOrderNumber as
                    | number
                    | null
                    | undefined;
                  const display =
                    typeof num === "number" && Number.isFinite(num) && num > 0
                      ? String(num).padStart(4, "0")
                      : String(workOrder.id);
                  return `Work Order #${display}`;
                })()}
              </p>
            </div>
          </div>

          {/* Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Overview</h3>
              
              <div>
                <label className="text-xs font-medium text-slate-500">Status</label>
                <p className="mt-1 text-sm font-medium text-slate-900">{workOrder.status}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500">Priority</label>
                <p className="mt-1">
                  <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    {workOrder.priority}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500">Due Date</label>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {workOrder.dueDate
                    ? new Date(workOrder.dueDate).toLocaleDateString()
                    : "—"}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500">Assigned To</label>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {workOrder.assignedTo?.name || "Unassigned"}
                </p>
              </div>

              {workOrder.location && (
                <div>
                  <label className="text-xs font-medium text-slate-500">Location</label>
                  <p className="mt-1 text-sm font-medium text-slate-900">{workOrder.location}</p>
                </div>
              )}

              {workOrder.partsRequired !== undefined && (
                <div>
                  <label className="text-xs font-medium text-slate-500">Parts Required</label>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {workOrder.partsRequired ? "Yes" : "No"}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Details</h3>
              
              {workOrder.asset && (
                <div>
                  <label className="text-xs font-medium text-slate-500">Asset</label>
                  <p className="mt-1 text-sm font-medium text-slate-900">{workOrder.asset.name}</p>
                </div>
              )}

              {workOrder.problemDescription && (
                <div>
                  <label className="text-xs font-medium text-slate-500">Problem Description</label>
                  <p className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{workOrder.problemDescription}</p>
                </div>
              )}

              {workOrder.helpDescription && (
                <div>
                  <label className="text-xs font-medium text-slate-500">How Can We Help?</label>
                  <p className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{workOrder.helpDescription}</p>
                </div>
              )}

              {workOrder.description && (
                <div>
                  <label className="text-xs font-medium text-slate-500">Description</label>
                  <p className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{workOrder.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          {workOrder.attachments && workOrder.attachments.length > 0 && (
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Attachments</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {workOrder.attachments.map((url, idx) => {
                  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                  const isVideo = /\.(mp4|mpeg|mov|avi)$/i.test(url);
                  
                  return (
                    <div key={idx} className="relative">
                      {isImage ? (
                        <img
                          src={url}
                          alt={`Attachment ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-slate-200"
                        />
                      ) : isVideo ? (
                        <video
                          src={url}
                          controls
                          className="w-full h-32 object-cover rounded-lg border border-slate-200"
                        />
                      ) : (
                        <a
                          href={url}
                          download
                          className="flex items-center justify-center w-full h-32 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100"
                        >
                          <span className="text-xs text-slate-600">Download</span>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* History & Activity Log */}
          {workOrder.notes && workOrder.notes.length > 0 && (
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 mb-4">History & Activity Log</h3>
              <div className="space-y-3">
                {workOrder.notes
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((note, idx) => (
                    <div key={idx} className="border-l-2 border-slate-200 pl-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-slate-900">
                          {note.author || "System"}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(note.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.text}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


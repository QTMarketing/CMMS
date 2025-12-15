import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type PageParams = {
  params: Promise<{
    token: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function SharedWorkOrderPage({ params }: PageParams) {
  const { token } = await params;

  // Fetch work order by share token
  const workOrder = await prisma.workOrder.findUnique({
    where: { shareToken: token },
    include: {
      asset: {
        select: {
          id: true,
          name: true,
          location: true,
          status: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      store: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          email: true,
        },
      },
      notes: {
        orderBy: { timestamp: "desc" },
      },
    },
  });

  if (!workOrder) {
    notFound();
  }

  // Format dates
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (date: Date | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const attachments: string[] = Array.isArray(workOrder.attachments)
    ? workOrder.attachments
    : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {workOrder.title}
              </h1>
              <p className="text-sm text-gray-500">
                Work Order #{workOrder.id}
              </p>
            </div>
            <div className="flex gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  workOrder.status === "Completed"
                    ? "bg-green-100 text-green-800"
                    : workOrder.status === "In Progress"
                      ? "bg-blue-100 text-blue-800"
                      : workOrder.status === "Cancelled"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {workOrder.status}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                {workOrder.priority}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Description */}
            {workOrder.description && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Description
                </h2>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {workOrder.description}
                </p>
              </div>
            )}

            {/* Problem Description */}
            {workOrder.problemDescription && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Where or What is the problem?
                </h2>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {workOrder.problemDescription}
                </p>
              </div>
            )}

            {/* Help Description */}
            {workOrder.helpDescription && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  How can we help?
                </h2>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {workOrder.helpDescription}
                </p>
              </div>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Attachments
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {attachments.map((url, idx) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                    const isVideo = /\.(mp4|mpeg|mov|avi)$/i.test(url);
                    return (
                      <div key={idx} className="relative">
                        {isImage ? (
                          <img
                            src={url}
                            alt={`Attachment ${idx + 1}`}
                            className="w-full h-32 object-cover rounded border border-gray-200"
                          />
                        ) : isVideo ? (
                          <video
                            src={url}
                            controls
                            className="w-full h-32 object-cover rounded border border-gray-200"
                          />
                        ) : (
                          <a
                            href={url}
                            download
                            className="block p-4 border border-gray-200 rounded text-center text-sm text-gray-600 hover:bg-gray-50"
                          >
                            Download File
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  History & Activity Log
                </h2>
                <div className="space-y-4">
                  {workOrder.notes.map((note) => (
                    <div
                      key={note.id}
                      className="border-l-2 border-blue-500 pl-4 py-2"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {note.author || "System"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(note.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{note.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Overview */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Overview
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Status
                  </label>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {workOrder.status}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Priority
                  </label>
                  <p className="mt-1">
                    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                      {workOrder.priority}
                    </span>
                  </p>
                </div>

                {workOrder.location && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Location
                    </label>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {workOrder.location}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Asset
                  </label>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {workOrder.asset?.name || "Unknown"}
                  </p>
                </div>

                {workOrder.assignedTo && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Assigned To
                    </label>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {workOrder.assignedTo.name}
                    </p>
                  </div>
                )}

                {workOrder.store && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Store
                    </label>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {workOrder.store.name}
                      {workOrder.store.code && ` (${workOrder.store.code})`}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Created At
                  </label>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {formatDateTime(workOrder.createdAt)}
                  </p>
                </div>

                {workOrder.dueDate && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Due Date
                    </label>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {formatDate(workOrder.dueDate)}
                    </p>
                  </div>
                )}

                {workOrder.completedAt && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Completed At
                    </label>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {formatDateTime(workOrder.completedAt)}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Parts Required
                  </label>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {workOrder.partsRequired ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { WorkOrderStatusControls } from "./WorkOrderStatusControls";
import { WorkOrderAssigneeControl } from "./WorkOrderAssigneeControl";
import { WorkOrderDescriptionEditor } from "./WorkOrderDescriptionEditor";

export default function WorkOrderDetails({
  workOrder: initialWorkOrder,
  asset,
  technicianMap = {},
}: {
  workOrder: any; // can be replaced with your real WorkOrder type
  asset?: any;
  technicianMap?: Record<string, string>;
}) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const userName = (session?.user as any)?.name || (session?.user as any)?.email || "User";
  const technicianId = (session?.user as any)?.technicianId as string | undefined;
  const isUser = role === "USER";
  const isTechnician = role === "TECHNICIAN";
  const canEdit = !isUser && !isTechnician; // Only admins can edit

  const [workOrder, setWorkOrder] = useState(initialWorkOrder);
  
  // Check if technician is assigned to this work order (using current state)
  const isAssignedTechnician = isTechnician && technicianId && workOrder.assignedToId === technicianId;
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [markCompleteError, setMarkCompleteError] = useState<string | null>(null);
  async function refreshWorkOrder() {
    try {
      // Fetch all work orders and find the one we need (since there's no single work order GET endpoint)
      const res = await fetch("/api/workorders", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          // Find the work order in the list
          const updated = data.data.find((wo: any) => wo.id === workOrder.id);
          if (updated) {
            setWorkOrder(updated);
          }
        }
      }
    } catch (err) {
      console.error("Failed to refresh work order:", err);
    }
  }

  // Resolve assigned technician name
  const assignedToName =
    (workOrder.assignedTo?.name ||
      (workOrder.assignedToId && technicianMap[workOrder.assignedToId]) ||
      workOrder.assignedToId) ?? "—";

  async function handleMarkComplete() {
    if (workOrder.status === "Completed") {
      return; // Already completed
    }

    setMarkingComplete(true);
    setMarkCompleteError(null);

    try {
      const res = await fetch(`/api/workorders/${workOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to mark work order as complete");
      }

      // Refresh the work order to show updated status
      await refreshWorkOrder();
    } catch (err: any) {
      setMarkCompleteError(err.message || "Failed to mark work order as complete");
    } finally {
      setMarkingComplete(false);
    }
  }

  async function handleAddComment() {
    if (!commentText.trim()) {
      setCommentError("Comment cannot be empty.");
      return;
    }

    setSubmittingComment(true);
    setCommentError(null);

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workOrderId: workOrder.id,
          text: commentText.trim(),
          author: userName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setCommentError(data.error || "Failed to add comment.");
        return;
      }

      // Add the new note to local state immediately
      const newNote = {
        id: Date.now(), // Temporary ID
        workOrderId: workOrder.id,
        text: commentText.trim(),
        author: userName,
        timestamp: new Date(),
      };
      
      // Update work order with new note
      setWorkOrder((prev: any) => ({
        ...prev,
        notes: [...(prev.notes || []), newNote],
      }));
      
      // Also refresh from server to get the real note with proper ID
      await refreshWorkOrder();

      setCommentText("");
    } catch (err) {
      setCommentError("Network error while adding comment.");
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleFileUpload(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileType", "workorder");
    
    // Get storeId from work order
    if (workOrder.storeId) {
      formData.append("storeId", workOrder.storeId);
    }

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to upload file");
    }

    return data.data.url;
  }

  async function handleAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingAttachments(true);
    setAttachmentError(null);

    try {
      const uploadPromises = Array.from(files).map((file) =>
        handleFileUpload(file)
      );
      const urls = await Promise.all(uploadPromises);
      
      // Update work order with new attachments
      const currentAttachments = Array.isArray(workOrder.attachments) 
        ? workOrder.attachments 
        : [];
      const newAttachments = [...currentAttachments, ...urls];

      // Update via API
      const res = await fetch(`/api/workorders/${workOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attachments: newAttachments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to update attachments");
      }

      // Update work order with the response data
      // Handle both { success: true, data: ... } and direct work order object
      const updatedWorkOrder = data.data || data;
      if (updatedWorkOrder && updatedWorkOrder.id) {
        setWorkOrder(updatedWorkOrder);
      } else {
        // Fallback: refresh from API
        await refreshWorkOrder();
      }
    } catch (err: any) {
      setAttachmentError(err.message || "Failed to upload attachments");
    } finally {
      setUploadingAttachments(false);
      // Reset input
      e.target.value = "";
    }
  }

  // Unified activity timeline: created, last updated, completed, and notes
  type ActivityItem =
    | { type: "created"; timestamp: Date }
    | { type: "updated"; timestamp: Date }
    | { type: "completed"; timestamp: Date }
    | { type: "note"; timestamp: Date; text: string; author?: string | null };

  const activityItems: ActivityItem[] = [];

  if (workOrder.createdAt) {
    activityItems.push({
      type: "created",
      timestamp: new Date(workOrder.createdAt),
    });
  }

  if (workOrder.updatedAt) {
    const updated = new Date(workOrder.updatedAt);
    const created = workOrder.createdAt
      ? new Date(workOrder.createdAt)
      : null;
    // Only add a separate "updated" event if it's meaningfully after createdAt
    if (!created || updated.getTime() - created.getTime() > 60_000) {
      activityItems.push({
        type: "updated",
        timestamp: updated,
      });
    }
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

  const isCompleted = workOrder.status === "Completed";

  // Try to read attachments if present on the workOrder object
  const attachments: any[] = Array.isArray((workOrder as any).attachments)
    ? (workOrder as any).attachments
    : [];

  return (
    <div className="space-y-4 text-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 md:text-xl">
            {workOrder.title}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Work Order #{workOrder.id}
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/workorders/${workOrder.id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
            >
              <span className="text-base leading-none">✎</span>
              <span>Edit Work Order</span>
            </Link>
          </div>
        )}
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left column: description + activity */}
        <div className="space-y-4 lg:col-span-2">
          {/* Work Order Details */}
          <section className="rounded-lg bg-white p-4 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Work Order Details
            </h3>

            {workOrder.location && (
              <div>
                <label className="text-xs font-medium text-slate-500">
                  Location
                </label>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {workOrder.location}
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-500">
                Parts Required
              </label>
              <p className="mt-1">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    workOrder.partsRequired
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {workOrder.partsRequired ? "Yes" : "No"}
                </span>
              </p>
            </div>

            {workOrder.problemDescription && (
              <div>
                <label className="text-xs font-medium text-slate-500">
                  Where or What is the problem?
                </label>
                <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                  {workOrder.problemDescription}
                </p>
              </div>
            )}

            {workOrder.helpDescription && (
              <div>
                <label className="text-xs font-medium text-slate-500">
                  How can we help?
                </label>
                <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                  {workOrder.helpDescription}
                </p>
              </div>
            )}

            {/* Description card with inline editing */}
            <div>
              <label className="text-xs font-medium text-slate-500">
                Additional Description
              </label>
              <div className="mt-1">
                {canEdit ? (
                  <WorkOrderDescriptionEditor
                    workOrderId={workOrder.id}
                    initialDescription={workOrder.description}
                  />
                ) : (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {workOrder.description || "—"}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* History & Activity Log */}
          <section className="overflow-hidden rounded-lg bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-base font-semibold text-slate-900">
                History &amp; Activity Log
              </h3>
        </div>
            <div className="space-y-4 px-4 py-4">
        {activityItems.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No activity has been recorded for this work order yet.
                </p>
        ) : (
                activityItems.map((item, idx) => {
                  const ts = item.timestamp.toLocaleString();

                  if (item.type === "note") {
              return (
                      <div key={idx} className="flex gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500">
                          💬
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {(item.author || "Technician") + " added a note"}
                          </p>
                          {item.text && (
                            <div className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 whitespace-pre-wrap">
                              {item.text}
                            </div>
                          )}
                          <p className="mt-1 text-[11px] text-slate-400">
                            {ts}
                          </p>
                  </div>
                      </div>
                    );
                  }

                  if (item.type === "completed") {
                    return (
                      <div key={idx} className="flex gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                          ✔
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            Status changed to{" "}
                            <span className="font-semibold text-emerald-700">
                              Completed
                            </span>
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {ts}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  if (item.type === "updated") {
                    return (
                      <div key={idx} className="flex gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500">
                          ⟳
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            Work order updated
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {ts}
                          </p>
                    </div>
                    </div>
                    );
                  }

                  // created
                  return (
                    <div key={idx} className="flex gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500">
                        ＋
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Work order created
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {ts}
                        </p>
                  </div>
                </div>
              );
                })
        )}
      </div>

            {/* Comment box */}
            <div className="border-t border-slate-200 px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={submittingComment}
                  />
                  {commentError && (
                    <p className="mt-1 text-[11px] text-red-500">{commentError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || submittingComment}
                    className="mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="text-sm leading-none">➤</span>
                    <span>{submittingComment ? "Adding..." : "Add Comment"}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right column: overview + attachments */}
        <div className="space-y-4">
          {/* Overview card */}
          <section className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">
              Overview
            </h3>

            <div>
              <label className="text-xs font-medium text-slate-500">
                Status
              </label>
              <div className="mt-1">
                {canEdit ? (
                  <WorkOrderStatusControls
                    workOrderId={workOrder.id}
                    initialStatus={workOrder.status}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      {workOrder.status}
                    </p>
                    {isAssignedTechnician && workOrder.status !== "Completed" && (
                      <button
                        onClick={handleMarkComplete}
                        disabled={markingComplete}
                        className="ml-2 rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {markingComplete ? "Marking..." : "Mark Complete"}
                      </button>
                    )}
                  </div>
                )}
              </div>
              {markCompleteError && (
                <p className="mt-1 text-xs text-red-600">{markCompleteError}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500">
                Priority
              </label>
              <p className="mt-1">
                <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  {workOrder.priority}
                </span>
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500">
                Due Date
              </label>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {workOrder.dueDate
                  ? new Date(workOrder.dueDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500">
                Assigned To
              </label>
              <div className="mt-1">
                {canEdit ? (
                  <WorkOrderAssigneeControl
                    workOrderId={workOrder.id}
                    initialAssigneeId={workOrder.assignedToId}
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-900">
                    {assignedToName}
                  </p>
                )}
              </div>
            </div>

      {asset && (
              <div>
                <label className="text-xs font-medium text-slate-500">
            Asset
                </label>
                <p className="mt-1 text-sm font-medium text-indigo-600 hover:underline">
                  {asset.name}
                </p>
          </div>
            )}

            {/* Status switching is handled by WorkOrderStatusControls above */}
          </section>

          {/* Attachments card (simple, data-driven if available) */}
          <section className="overflow-hidden rounded-lg bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-base font-semibold text-slate-900">
                Attachments
              </h3>
              {/* Allow technicians and admins to upload attachments */}
              {(isTechnician || canEdit) && (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleAttachmentUpload}
                    disabled={uploadingAttachments}
                    className="hidden"
                  />
                  <span className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                    {uploadingAttachments ? "Uploading..." : "Upload"}
                  </span>
                </label>
              )}
            </div>
            <div className="space-y-3 px-4 py-4">
              {attachmentError && (
                <p className="text-xs text-red-500">{attachmentError}</p>
              )}
              {attachments.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No attachments have been added to this work order yet.
                </p>
              ) : (
                attachments.map((url, idx) => {
                  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                  const isVideo = /\.(mp4|mpeg|mov|avi)$/i.test(url);
                  const filename = url.split("/").pop() || "Attachment";

                  return (
                    <div
                      key={idx}
                      className="rounded-lg bg-slate-50 overflow-hidden"
                    >
                      {isImage ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={url}
                            alt={filename}
                            className="w-full h-auto max-h-64 object-contain bg-white"
                          />
                        </a>
                      ) : isVideo ? (
                        <video
                          src={url}
                          controls
                          className="w-full h-auto max-h-64 bg-black"
                        >
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <div className="flex items-center gap-3 px-3 py-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-xs font-semibold text-slate-600">
                            📄
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-slate-900">
                              {filename}
                            </p>
                          </div>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full p-1 hover:bg-slate-200"
                          >
                            <span className="text-xs text-slate-500">↓</span>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


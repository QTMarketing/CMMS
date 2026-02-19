"use client";

import { useState, useRef, useEffect } from "react";

type UiStatus = "Pending" | "In Progress" | "Pending Review" | "Completed" | "On Hold";

type RefinementData = {
  title: string;
  description?: string | null;
  assetId?: string | null;
  storeId?: string | null;
};

type Props = {
  workOrderId: string;
  initialStatus: string; // backend status string
  /** When provided, accepting (Pending Review → Completed) opens a dialog to edit details before finalizing. */
  refinementData?: RefinementData | null;
  /** Called after work order is accepted so parent can refresh. */
  onAccepted?: () => void;
};

const backendToUi: Record<string, UiStatus> = {
  Open: "Pending",
  "In Progress": "In Progress",
  "Pending Review": "Pending Review",
  Completed: "Completed",
  Cancelled: "On Hold",
};

const uiToBackend: Record<UiStatus, string> = {
  Pending: "Open",
  "In Progress": "In Progress",
  "Pending Review": "Pending Review",
  Completed: "Completed",
  "On Hold": "Cancelled",
};

const STATUS_ORDER: UiStatus[] = [
  "Pending",
  "In Progress",
  "Pending Review",
  "On Hold",
  "Completed",
];

type AssetOption = { id: string; name: string };

export function WorkOrderStatusControls({
  workOrderId,
  initialStatus,
  refinementData,
  onAccepted,
}: Props) {
  const initialUi: UiStatus =
    backendToUi[initialStatus] ?? ("Pending" as UiStatus);

  const [current, setCurrent] = useState<UiStatus>(initialUi);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const acceptDialogRef = useRef<HTMLDialogElement>(null);
  const [acceptTitle, setAcceptTitle] = useState("");
  const [acceptDescription, setAcceptDescription] = useState("");
  const [acceptAssetId, setAcceptAssetId] = useState<string>("");
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);

  async function changeStatus(
    next: UiStatus,
    rejectionReason?: string,
    extraBody?: Record<string, unknown>
  ) {
    const backendStatus = uiToBackend[next];
    const currentBackend = uiToBackend[current];
    if (backendStatus === currentBackend) return;

    const isRejectFromPendingReview =
      current === "Pending Review" && next === "In Progress";
    if (isRejectFromPendingReview && !rejectionReason?.trim()) {
      setRejectDialogOpen(true);
      dialogRef.current?.showModal();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        status: backendStatus,
        ...extraBody,
      };
      if (isRejectFromPendingReview && rejectionReason?.trim()) {
        body.rejectionReason = rejectionReason.trim();
      }
      const res = await fetch(`/api/workorders/${workOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data?.error || "Unable to update status. Please try again later."
        );
        return;
      }

      setCurrent(next);
      if (rejectDialogOpen) {
        setRejectDialogOpen(false);
        setRejectReason("");
        dialogRef.current?.close();
      }
      if (acceptDialogOpen) {
        setAcceptDialogOpen(false);
        acceptDialogRef.current?.close();
        onAccepted?.();
      }
    } catch {
      setError("Network error while updating status.");
    } finally {
      setSaving(false);
    }
  }

  function handleSelectChange(next: UiStatus) {
    const isRejectFromPendingReview =
      current === "Pending Review" && next === "In Progress";
    if (isRejectFromPendingReview) {
      setRejectDialogOpen(true);
      dialogRef.current?.showModal();
      setRejectReason("");
      return;
    }
    const isAcceptFromPendingReview =
      current === "Pending Review" && next === "Completed";
    if (isAcceptFromPendingReview && refinementData) {
      setAcceptTitle(refinementData.title ?? "");
      setAcceptDescription(refinementData.description ?? "");
      setAcceptAssetId(refinementData.assetId ?? "");
      setAcceptDialogOpen(true);
      acceptDialogRef.current?.showModal();
      return;
    }
    changeStatus(next);
  }

  useEffect(() => {
    if (!acceptDialogOpen || !refinementData) return;
    setAssetsLoading(true);
    const url = refinementData.storeId
      ? `/api/assets?storeId=${encodeURIComponent(refinementData.storeId)}`
      : "/api/assets";
    fetch(url, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: any[]) => {
        setAssets(
          Array.isArray(data)
            ? data.map((a: any) => ({ id: a.id, name: a.name || a.id }))
            : []
        );
      })
      .catch(() => setAssets([]))
      .finally(() => setAssetsLoading(false));
  }, [acceptDialogOpen, refinementData?.storeId]);

  function submitReject() {
    if (!rejectReason?.trim()) return;
    changeStatus("In Progress", rejectReason);
  }

  function submitAccept() {
    const body: Record<string, unknown> = { status: "Completed" };
    if (refinementData) {
      body.title = acceptTitle.trim() || refinementData.title;
      body.description = acceptDescription;
      body.assetId = acceptAssetId.trim() || null;
    }
    changeStatus("Completed", undefined, body);
  }

  return (
    <div className="space-y-1">
      <select
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        value={current}
        disabled={saving}
        onChange={(e) => handleSelectChange(e.target.value as UiStatus)}
      >
        {STATUS_ORDER.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-[11px] text-red-500" role="alert">
          {error}
        </p>
      )}
      {saving && (
        <p className="text-[11px] text-slate-400">Updating status…</p>
      )}

      <dialog
        ref={dialogRef}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg backdrop:bg-black/20 max-w-md w-full"
        onCancel={() => {
          setRejectDialogOpen(false);
          setRejectReason("");
        }}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Reject work order (return for changes)
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          The submitter will receive an email with your reason. Please provide a reason for rejection.
        </p>
        <label className="block mb-3">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            Reason for rejection <span className="text-red-500">*</span>
          </span>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Explain what needs to be changed. This will be emailed to the submitter."
          />
        </label>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => {
              dialogRef.current?.close();
              setRejectDialogOpen(false);
              setRejectReason("");
            }}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submitReject}
            disabled={!rejectReason?.trim() || saving}
            className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            Reject &amp; send email
          </button>
        </div>
      </dialog>

      {/* Accept & finalize: edit details before marking Completed */}
      <dialog
        ref={acceptDialogRef}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg backdrop:bg-black/20 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onCancel={() => setAcceptDialogOpen(false)}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Accept &amp; finalize work order
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Edit any details below for accuracy (e.g. spelling, asset) before marking as completed.
        </p>
        <div className="space-y-3">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Title</span>
            <input
              type="text"
              value={acceptTitle}
              onChange={(e) => setAcceptTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Work order title"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Description</span>
            <textarea
              value={acceptDescription}
              onChange={(e) => setAcceptDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional description"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Asset</span>
            <select
              value={acceptAssetId}
              onChange={(e) => setAcceptAssetId(e.target.value)}
              disabled={assetsLoading}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">No asset</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button
            type="button"
            onClick={() => {
              acceptDialogRef.current?.close();
              setAcceptDialogOpen(false);
            }}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submitAccept}
            disabled={saving || !acceptTitle.trim()}
            className="px-3 py-1.5 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Accept &amp; finalize"}
          </button>
        </div>
      </dialog>
    </div>
  );
}



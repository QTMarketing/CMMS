"use client";

import { useState } from "react";

type UiStatus = "Pending" | "In Progress" | "Completed" | "On Hold";

type Props = {
  workOrderId: string;
  initialStatus: string; // backend status string
};

const backendToUi: Record<string, UiStatus> = {
  Open: "Pending",
  "In Progress": "In Progress",
  Completed: "Completed",
  Cancelled: "On Hold",
};

const uiToBackend: Record<UiStatus, string> = {
  Pending: "Open",
  "In Progress": "In Progress",
  Completed: "Completed",
  "On Hold": "Cancelled",
};

const STATUS_ORDER: UiStatus[] = [
  "Pending",
  "In Progress",
  "On Hold",
  "Completed",
];

export function WorkOrderStatusControls({ workOrderId, initialStatus }: Props) {
  const initialUi: UiStatus =
    backendToUi[initialStatus] ?? ("Pending" as UiStatus);

  const [current, setCurrent] = useState<UiStatus>(initialUi);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(next: UiStatus) {
    const backendStatus = uiToBackend[next];
    const currentBackend = uiToBackend[current];
    if (backendStatus === currentBackend) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/workorders/${workOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: backendStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data?.error || "Unable to update status. Please try again later."
        );
        return;
      }

      setCurrent(next);
    } catch {
      setError("Network error while updating status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-1">
      <select
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        value={current}
        disabled={saving}
        onChange={(e) => changeStatus(e.target.value as UiStatus)}
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
    </div>
  );
}



"use client";

import { useEffect, useState } from "react";

type Technician = {
  id: string;
  name: string;
  email?: string;
  active?: boolean;
};

type Props = {
  workOrderId: string;
  initialAssigneeId?: string | null;
  /** Called after assignee is updated (e.g. after share by email) so parent can refresh. */
  onAssigned?: () => void;
};

export function WorkOrderAssigneeControl({
  workOrderId,
  initialAssigneeId,
  onAssigned,
}: Props) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [assigneeId, setAssigneeId] = useState<string>(initialAssigneeId || "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shareEmail, setShareEmail] = useState("");
  const [shareSaving, setShareSaving] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    setAssigneeId(initialAssigneeId || "");
  }, [initialAssigneeId]);

  useEffect(() => {
    let cancelled = false;
    async function loadTechnicians() {
      setLoading(true);
      try {
        const res = await fetch("/api/technicians", { cache: "no-store" });
        const data = await res.json();
        const list: Technician[] = Array.isArray(data) ? data : data.data || [];
        if (!cancelled) {
          setTechnicians(list);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load technicians.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadTechnicians();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleChange(nextId: string) {
    setAssigneeId(nextId);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/workorders/${workOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedToId: nextId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data?.error || "Unable to update assignee. Please try again later."
        );
      } else {
        onAssigned?.();
      }
    } catch {
      setError("Network error while updating assignee.");
    } finally {
      setSaving(false);
    }
  }

  async function handleShareByEmail() {
    const email = shareEmail.trim();
    if (!email) {
      setShareError("Enter the technician's email address.");
      return;
    }
    setShareSaving(true);
    setShareError(null);
    try {
      const res = await fetch(`/api/workorders/${workOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToEmail: email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setShareError(data?.error || "Unable to share work order with this email.");
        return;
      }
      const newAssigneeId = data?.data?.assignedToId ?? null;
      if (newAssigneeId) {
        setAssigneeId(newAssigneeId);
      }
      setShareEmail("");
      onAssigned?.();
    } catch {
      setShareError("Network error. Please try again.");
    } finally {
      setShareSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <select
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={assigneeId}
          onChange={(e) => handleChange(e.target.value)}
          disabled={loading || saving}
        >
          <option value="">Unassigned</option>
          {technicians
            .filter((t) => t.active !== false)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>
        {error && (
          <p className="text-[11px] text-red-500" role="alert">
            {error}
          </p>
        )}
        {(loading || saving) && (
          <p className="text-[11px] text-slate-400">
            {loading ? "Loading technicians…" : "Saving assignee…"}
          </p>
        )}
      </div>

      <div className="border-t border-slate-200 pt-2">
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Share with technician by email
        </label>
        <p className="text-[11px] text-slate-500 mb-1.5">
          Enter their email to assign this work order and send them a formal notification.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={shareEmail}
            onChange={(e) => {
              setShareEmail(e.target.value);
              setShareError(null);
            }}
            placeholder="technician@example.com"
            className="flex-1 min-w-0 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={shareSaving}
          />
          <button
            type="button"
            onClick={handleShareByEmail}
            disabled={shareSaving || !shareEmail.trim()}
            className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {shareSaving ? "Sharing…" : "Share"}
          </button>
        </div>
        {shareError && (
          <p className="mt-1 text-[11px] text-red-500" role="alert">
            {shareError}
          </p>
        )}
      </div>
    </div>
  );
}



"use client";

import { useEffect, useState } from "react";

type Technician = {
  id: string;
  name: string;
  active?: boolean;
};

type Props = {
  workOrderId: string;
  initialAssigneeId?: string | null;
};

export function WorkOrderAssigneeControl({
  workOrderId,
  initialAssigneeId,
}: Props) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [assigneeId, setAssigneeId] = useState<string>(initialAssigneeId || "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      }
    } catch {
      setError("Network error while updating assignee.");
    } finally {
      setSaving(false);
    }
  }

  return (
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
  );
}



"use client";

import { useState } from "react";

type Props = {
  workOrderId: string;
  initialDescription?: string | null;
};

export function WorkOrderDescriptionEditor({
  workOrderId,
  initialDescription,
}: Props) {
  const [value, setValue] = useState<string>(initialDescription ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const dirty = value !== (initialDescription ?? "");

  async function handleSave() {
    if (!dirty) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/workorders/${workOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: value || "" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data?.error || "Unable to save description. Please try again."
        );
        return;
      }
      setSavedAt(new Date());
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        rows={5}
        className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe the task, steps, and any safety notes…"
      />
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <div className="flex flex-col items-end gap-0.5">
          {error && (
            <span className="text-[11px] text-red-500" role="alert">
              {error}
            </span>
          )}
          {savedAt && !error && (
            <span className="text-[11px] text-slate-400">
              Saved at {savedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}



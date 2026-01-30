"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Drawer from "@/components/ui/Drawer";
import { isAdminLike } from "@/lib/roles";

interface AddPMScheduleDrawerProps {
  defaultStoreId?: string;
  onSuccess?: () => void;
}

export default function AddPMScheduleDrawer({ defaultStoreId, onSuccess }: AddPMScheduleDrawerProps = {}) {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assetId, setAssetId] = useState("");
  const [frequencyDays, setFrequencyDays] = useState<string>("30");
  const [nextDueDate, setNextDueDate] = useState("");
  const [active, setActive] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canCreate = isAdminLike(role);

  useEffect(() => {
    if (!open) return;
    
    // Set default date to today
    const today = new Date();
    setNextDueDate(today.toISOString().slice(0, 10));

    fetch("/api/assets", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const assetsList = Array.isArray(data) ? data : data.data || [];
        // Filter assets by store if defaultStoreId is provided
        const filtered = defaultStoreId
          ? assetsList.filter((a: any) => a.storeId === defaultStoreId)
          : assetsList;
        setAssets(filtered);
      })
      .catch(() => {
        setAssets([]);
      });
  }, [open, defaultStoreId]);

  function resetForm() {
    setTitle("");
    setAssetId("");
    setFrequencyDays("30");
    const today = new Date();
    setNextDueDate(today.toISOString().slice(0, 10));
    setActive(true);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!assetId) {
      setError("Asset is required.");
      return;
    }

    const frequency = parseInt(frequencyDays, 10);
    if (!frequency || frequency <= 0) {
      setError("Frequency must be a positive number.");
      return;
    }

    if (!nextDueDate) {
      setError("Next due date is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          assetId,
          frequencyDays: frequency,
          nextDueDate,
          active,
          storeId: defaultStoreId || undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.success === false)) {
        const message =
          data?.error ||
          (res.status === 403
            ? "You are not authorized to create PM schedules."
            : "Failed to create PM schedule.");
        setError(message);
        return;
      }

      resetForm();
      setOpen(false);
      if (onSuccess) {
        onSuccess();
      } else {
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setError("Unexpected error while creating PM schedule.");
    } finally {
      setLoading(false);
    }
  }

  if (!canCreate) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
      >
        Add PM Schedule
      </button>

      <Drawer open={open} onClose={() => setOpen(false)}>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 max-w-md mx-auto"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add PM Schedule</h2>
            <p className="mt-1 text-xs text-gray-500">
              Create a new preventive maintenance schedule for this store.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              PM Name / Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Asset <span className="text-red-500">*</span>
            </label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            >
              <option value="">Select an asset…</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Frequency (days) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={frequencyDays}
                onChange={(e) => setFrequencyDays(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Next Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="active" className="text-xs font-medium text-gray-700">
              Active schedule
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create PM Schedule"}
            </button>
          </div>
        </form>
      </Drawer>
    </>
  );
}

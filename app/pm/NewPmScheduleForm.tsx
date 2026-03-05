"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AssetOption = {
  id: string;
  name: string;
  storeId: string | null;
};

type StoreOption = {
  id: string;
  name: string;
  code: string | null;
};

type Props = {
  defaultDate: string;
  assets: AssetOption[];
  stores: StoreOption[];
  canSeeAllStores: boolean;
  userStoreId: string | null;
};

export default function NewPmScheduleForm({
  defaultDate,
  assets,
  stores,
  canSeeAllStores,
  userStoreId,
}: Props) {
  const router = useRouter();

  // Determine initial store selection
  const initialStoreId =
    (canSeeAllStores && stores[0]?.id) || userStoreId || "";

  const [title, setTitle] = useState("");
  const [storeId, setStoreId] = useState<string>(initialStoreId);
  const [assetId, setAssetId] = useState("");
  const [frequencyDays, setFrequencyDays] = useState<string>("30");
  const [nextDueDate, setNextDueDate] = useState(defaultDate);
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredAssets =
    storeId && storeId !== ""
      ? assets.filter((a) => a.storeId === storeId)
      : assets;

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
    const freq = parseInt(frequencyDays, 10);
    if (!freq || freq <= 0) {
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
          frequencyDays: freq,
          nextDueDate,
          active,
          // For MASTER_ADMIN, allow explicit store choice; for others, API will
          // infer from user store.
          storeId: canSeeAllStores ? storeId || null : undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || (data && data.success === false)) {
        setError(
          data?.error ||
            (res.status === 403
              ? "You are not authorized to create PM schedules."
              : "Failed to create PM schedule.")
        );
        return;
      }

      router.push("/pm");
      router.refresh();
    } catch {
      setError("Unexpected error while creating PM schedule.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {canSeeAllStores && (
        <div className="space-y-1">
          <label
            htmlFor="storeId"
            className="block text-sm font-medium text-gray-700"
          >
            Store
          </label>
          <select
            id="storeId"
            value={storeId}
            onChange={(e) => {
              setStoreId(e.target.value);
              setAssetId("");
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
                {store.code ? ` (${store.code})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1">
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700"
        >
          PM Name / Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="assetId"
          className="block text-sm font-medium text-gray-700"
        >
          Asset
        </label>
        <select
          id="assetId"
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select an asset…</option>
          {filteredAssets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="frequencyDays"
            className="block text-sm font-medium text-gray-700"
          >
            Frequency (days)
          </label>
          <input
            id="frequencyDays"
            type="number"
            min={1}
            value={frequencyDays}
            onChange={(e) => setFrequencyDays(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="nextDueDate"
            className="block text-sm font-medium text-gray-700"
          >
            Next Due Date
          </label>
          <input
            id="nextDueDate"
            type="date"
            value={nextDueDate}
            onChange={(e) => setNextDueDate(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="active"
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label
          htmlFor="active"
          className="text-sm font-medium text-gray-700"
        >
          Active schedule
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save PM Schedule"}
        </button>
        <Link
          href="/pm"
          className="text-sm font-medium text-gray-600 hover:text-gray-800"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}


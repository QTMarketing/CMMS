"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import Drawer from "@/components/ui/Drawer";
import {
  isAdminLike,
  isMasterAdmin,
  isStoreAdmin,
} from "@/lib/roles";

type StoreOption = {
  id: string;
  name: string;
  code?: string | null;
};

const statusOptions = ["Active", "Down", "Retired"] as const;

export default function AddAssetDrawer() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const userStoreId = ((session?.user as any)?.storeId ?? null) as
    | string
    | null;

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] =
    useState<(typeof statusOptions)[number]>("Active");
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = isAdminLike(role);
  const isMaster = isMasterAdmin(role);
  const isStoreScopedAdmin = isStoreAdmin(role) || (!!role && !isMaster);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !isMaster) return;
    if (stores.length > 0 || loadingStores) return;

    setLoadingStores(true);
    fetch("/api/stores", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data?.data) ? data.data : [];
        setStores(list);
      })
      .catch(() => {
        setError("Failed to load stores. Please try again.");
      })
      .finally(() => setLoadingStores(false));
  }, [open, isMaster, stores.length, loadingStores]);

  useEffect(() => {
    if (isMaster) return; // master selects explicitly
    if (userStoreId) {
      setStoreId(userStoreId);
    }
  }, [isMaster, userStoreId]);

  const storeOptions = useMemo(
    () =>
      stores.map((s) => ({
        id: s.id,
        label: s.code ? `${s.name} (${s.code})` : s.name,
      })),
    [stores]
  );

  function resetForm() {
    setName("");
    setLocation("");
    setStatus("Active");
    if (isMaster) {
      setStoreId("");
    }
    setError(null);
  }

  function validate(): string | null {
    if (!canCreate) return "You are not allowed to create assets.";
    if (!name.trim()) return "Name is required.";

    let resolvedStoreId: string | null = null;
    if (isMaster) {
      resolvedStoreId = storeId || null;
    } else {
      resolvedStoreId = userStoreId;
    }

    if (!resolvedStoreId) {
      return "Your user is not associated with a store.";
    }

    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const bodyStoreId = isMaster ? storeId || null : userStoreId;

      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          location: location.trim() || undefined,
          status,
          storeId: bodyStoreId,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.success === false)) {
        const message =
          data?.error ||
          (res.status === 403
            ? "You are not authorized to create assets."
            : "Failed to create asset.");
        setError(message);
        return;
      }

      resetForm();
      setOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("Unexpected error while creating asset.");
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
        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
      >
        Add Asset
      </button>

      <Drawer open={open} onClose={() => setOpen(false)}>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 max-w-md mx-auto"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Asset</h2>
            <p className="mt-1 text-xs text-gray-500">
              Create a new asset for your store. Master admins can choose
              any store; store admins are limited to their own store.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-300 focus:outline-none focus:ring-0"
              placeholder="Optional location or area"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as (typeof statusOptions)[number])
              }
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {isMaster && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Store <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                required
              >
                <option value="">
                  {loadingStores ? "Loading stores..." : "Select a store…"}
                </option>
                {storeOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
              className="rounded-md border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              disabled={loading || isPending}
            >
              {loading ? "Creating..." : "Create Asset"}
            </button>
          </div>
        </form>
      </Drawer>
    </>
  );
}



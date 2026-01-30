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

interface AddAssetDrawerProps {
  defaultStoreId?: string;
  onSuccess?: () => void;
}

export default function AddAssetDrawer({ defaultStoreId, onSuccess }: AddAssetDrawerProps = {}) {
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
  const [storeId, setStoreId] = useState<string>(defaultStoreId || "");
  const [loading, setLoading] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New fields
  const [assetId, setAssetId] = useState<string>("");
  const [parentAssetId, setParentAssetId] = useState<string>("");
  const [parentAssetIdNumber, setParentAssetIdNumber] = useState<string>("");
  const [parentAssetName, setParentAssetName] = useState<string>("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [category, setCategory] = useState("");
  const [parentAssets, setParentAssets] = useState<any[]>([]);

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
    if (defaultStoreId) {
      setStoreId(defaultStoreId);
    } else if (isMaster) {
      // master selects explicitly - don't auto-set
    } else if (userStoreId) {
      setStoreId(userStoreId);
    }
  }, [isMaster, userStoreId, defaultStoreId]);

  // Reset storeId when drawer opens/closes if defaultStoreId is provided
  useEffect(() => {
    if (open && defaultStoreId) {
      setStoreId(defaultStoreId);
    }
  }, [open, defaultStoreId]);

  // Effective store for this drawer (used to scope parent assets)
  const effectiveStoreId = isMaster ? storeId || defaultStoreId || null : (defaultStoreId || userStoreId);

  // Load parent assets for dropdown, scoped to the current store
  useEffect(() => {
    if (!open) return;

    // For master admin, require a store selection before loading parent assets
    if (isMaster && !effectiveStoreId) {
      setParentAssets([]);
      return;
    }

    const url = effectiveStoreId
      ? `/api/assets?storeId=${effectiveStoreId}`
      : "/api/assets";

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const assets = Array.isArray(data) ? data : [];
        setParentAssets(assets);
      })
      .catch(() => {
        // Ignore errors
      });
  }, [open, effectiveStoreId, isMaster]);

  // Update parent asset name when parent asset is selected
  useEffect(() => {
    if (parentAssetId) {
      const selectedParent = parentAssets.find((a) => a.id === parentAssetId);
      if (selectedParent) {
        setParentAssetName(selectedParent.name || "");
        setParentAssetIdNumber(selectedParent.assetId?.toString() || "");
      }
    } else {
      setParentAssetName("");
      setParentAssetIdNumber("");
    }
  }, [parentAssetId, parentAssets]);

  const storeOptions = useMemo(
    () =>
      stores.map((s) => ({
        id: s.id,
        label: s.code ? `${s.name} (${s.code})` : s.name,
      })),
    [stores]
  );

  // Filter parent assets by location so that once a location is chosen,
  // only assets from the same location are shown (within the same store).
  const filteredParentAssets = useMemo(() => {
    if (!location.trim()) return parentAssets;
    const loc = location.trim().toLowerCase();
    return parentAssets.filter((a) =>
      (a.location || "").toLowerCase() === loc
    );
  }, [parentAssets, location]);

  function resetForm() {
    setName("");
    setLocation("");
    setStatus("Active");
    setAssetId("");
    setParentAssetId("");
    setParentAssetIdNumber("");
    setParentAssetName("");
    setMake("");
    setModel("");
    setCategory("");
    // Preserve defaultStoreId if provided, otherwise reset
    if (isMaster && !defaultStoreId) {
      setStoreId("");
    } else if (defaultStoreId) {
      setStoreId(defaultStoreId);
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
          assetId: assetId.trim() ? parseInt(assetId.trim(), 10) : undefined,
          parentAssetId: parentAssetId || undefined,
          parentAssetIdNumber: parentAssetIdNumber.trim() ? parseInt(parentAssetIdNumber.trim(), 10) : undefined,
          parentAssetName: parentAssetName.trim() || undefined,
          make: make.trim() || undefined,
          model: model.trim() || undefined,
          category: category.trim() || undefined,
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
      if (onSuccess) {
        onSuccess();
      } else {
        startTransition(() => {
          router.refresh();
        });
      }
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

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Asset ID (Number)
            </label>
            <input
              type="number"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Leave blank to auto-assign"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Parent Asset
            </label>
            <select
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={parentAssetId}
              onChange={(e) => setParentAssetId(e.target.value)}
            >
              <option value="">None (Top-level asset)</option>
              {filteredParentAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.assetId ? `#${asset.assetId} - ` : ""}{asset.name}
                </option>
              ))}
            </select>
          </div>

          {parentAssetId && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Parent Asset ID (Number)
                </label>
                <input
                  type="number"
                  value={parentAssetIdNumber}
                  onChange={(e) => setParentAssetIdNumber(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Auto-filled from selected parent"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Parent Asset Name
                </label>
                <input
                  type="text"
                  value={parentAssetName}
                  onChange={(e) => setParentAssetName(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Auto-filled from selected parent"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Make
            </label>
            <input
              type="text"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., Caterpillar, John Deere"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Model
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., CAT 320D, JD 850K"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., Heavy Equipment, Vehicles, Tools"
            />
          </div>

          {isMaster && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Store <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={storeId}
                onChange={(e) => {
                  setStoreId(e.target.value);
                  // Clear any selected parent asset when changing store
                  setParentAssetId("");
                }}
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



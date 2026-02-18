"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import Drawer from "@/components/ui/Drawer";

type Store = {
  id: string;
  name: string;
  code: string | null;
  // Address may be undefined for some callers; treat as optional in the type.
  address?: string | null;
  city: string | null;
  state: string | null;
  zipCode?: string | null;
  categories?: {
    id: string;
    name: string;
    color?: string | null;
  }[];
};

type EditStoreDrawerProps = {
  store: Store | null;
  open: boolean;
  onClose: () => void;
  allCategories?: {
    id: string;
    name: string;
    color?: string | null;
  }[];
};

export default function EditStoreDrawer({
  store,
  open,
  onClose,
  allCategories,
}: EditStoreDrawerProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  useEffect(() => {
    if (store) {
      setName(store.name || "");
      setCode(store.code || "");
      setAddress(store.address || "");
      setCity(store.city || "");
      setState(store.state || "");
      setZipCode(store.zipCode || "");
      setError(null);
      setSelectedCategoryIds(
        (store.categories || []).map((c) => c.id)
      );
    }
  }, [store]);

  function validate(): string | null {
    if (!name.trim()) return "Store name is required.";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!store) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/stores/${store.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          zipCode: zipCode.trim() || undefined,
          categoryIds: selectedCategoryIds,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.success === false)) {
        const message =
          data?.error ||
          (res.status === 403
            ? "You are not authorized to edit stores."
            : "Failed to update store.");
        setError(message);
        return;
      }

      onClose();
      router.refresh();
    } catch (err) {
      setError("Unexpected error while updating store.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose}>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 max-w-md mx-auto"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Edit Store</h2>
          <p className="mt-1 text-xs text-gray-500">
            Update store information and location details.
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
            Code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-300 focus:outline-none focus:ring-0"
            placeholder="Optional short code (e.g. SF-01)"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-300 focus:outline-none focus:ring-0"
            placeholder="Street address (optional)"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-300 focus:outline-none focus:ring-0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              State / Region
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-300 focus:outline-none focus:ring-0"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Categories
          </label>
          <div className="flex flex-wrap gap-2">
            {(allCategories || []).length === 0 ? (
              <p className="text-xs text-gray-500">
                No categories defined yet.
              </p>
            ) : (
              (allCategories || []).map((cat) => {
                const checked = selectedCategoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryIds((prev) =>
                        prev.includes(cat.id)
                          ? prev.filter((id) => id !== cat.id)
                          : [...prev, cat.id]
                      );
                    }}
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${
                      checked
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-50 text-gray-700 border-gray-300"
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            ZIP / Postal Code
          </label>
          <input
            type="text"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-300 focus:outline-none focus:ring-0"
            placeholder="e.g. 94103"
          />
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Store"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}


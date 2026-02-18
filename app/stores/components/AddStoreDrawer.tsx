"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import Drawer from "@/components/ui/Drawer";

export type StoreSummary = {
  id: string;
  name: string;
  code: string | null;
};

type StoreCategory = {
  id: string;
  name: string;
  color?: string | null;
};

export default function AddStoreDrawer({
  categories: initialCategories,
}: {
  categories: StoreCategory[];
}) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const isMasterAdmin = role === "MASTER_ADMIN";

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  
  // Category creation state
  const [categories, setCategories] = useState<StoreCategory[]>(initialCategories);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const router = useRouter();

  // Refresh categories when drawer opens
  useEffect(() => {
    if (open) {
      fetch("/api/store-categories", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setCategories(data.data);
          }
        })
        .catch(() => {});
    }
  }, [open]);

  function resetForm() {
    setName("");
    setCode("");
    setAddress("");
    setCity("");
    setState("");
    setZipCode("");
    setManagerEmail("");
    setManagerPassword("");
    setError(null);
    setSelectedCategoryIds([]);
    setShowCreateCategory(false);
    setNewCategoryName("");
    setNewCategoryDescription("");
    setNewCategoryColor("");
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setError("Category name is required.");
      return;
    }

    setCreatingCategory(true);
    setError(null);

    try {
      const res = await fetch("/api/store-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim() || undefined,
          color: newCategoryColor.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.success === false)) {
        setError(data?.error || "Failed to create category.");
        setCreatingCategory(false);
        return;
      }

      // Add new category to list and select it
      const newCategory = data.data;
      setCategories((prev) => [...prev, newCategory]);
      setSelectedCategoryIds((prev) => [...prev, newCategory.id]);
      setNewCategoryName("");
      setNewCategoryDescription("");
      setNewCategoryColor("");
      setShowCreateCategory(false);
    } catch (err) {
      setError("Unexpected error while creating category.");
    } finally {
      setCreatingCategory(false);
    }
  }

  function validate(): string | null {
    if (!name.trim()) return "Store name is required.";
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
      const res = await fetch("/api/stores", {
        method: "POST",
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
          managerEmail: managerEmail.trim() || undefined,
          managerPassword: managerPassword || undefined,
          categoryIds: selectedCategoryIds,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.success === false)) {
        const message =
          data?.error ||
          (res.status === 403
            ? "You are not authorized to create stores."
            : "Failed to create store.");
        setError(message);
        return;
      }

      resetForm();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError("Unexpected error while creating store.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-opacity-90"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add Store
      </button>

      <Drawer open={open} onClose={() => setOpen(false)}>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 max-w-md mx-auto"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Store</h2>
            <p className="mt-1 text-xs text-gray-500">
              Create a new store/location. You can later assign users and
              technicians to this store.
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-700">
                Categories (optional)
              </label>
              {isMasterAdmin && (
                <button
                  type="button"
                  onClick={() => setShowCreateCategory(!showCreateCategory)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  {showCreateCategory ? "Cancel" : "+ New Category"}
                </button>
              )}
            </div>

            {showCreateCategory && isMasterAdmin && (
              <div className="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
                <form onSubmit={handleCreateCategory} className="space-y-2">
                  <div>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name *"
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={newCategoryDescription}
                      onChange={(e) => setNewCategoryDescription(e.target.value)}
                      placeholder="Description (optional)"
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-gray-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={newCategoryColor}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      placeholder="Color hex (optional, e.g. #FF5733)"
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-gray-300 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={creatingCategory}
                    className="w-full rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {creatingCategory ? "Creating..." : "Create Category"}
                  </button>
                </form>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {categories.length === 0 ? (
                <p className="text-xs text-gray-500">
                  {isMasterAdmin
                    ? "No categories yet. Click 'New Category' above to create one."
                    : "No categories yet. Master Admin can create categories."}
                </p>
              ) : (
                categories.map((cat) => {
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
                      style={
                        cat.color && !checked
                          ? { borderColor: cat.color, color: cat.color }
                          : undefined
                      }
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

          <div className="mt-2 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Store Manager Account (Optional)
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Optionally create a login account for the store manager. If provided, this will create a user account that can be used to log in and manage this store.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Manager Email
                </label>
                <input
                  type="email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="manager@store.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Manager Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={managerPassword}
                    onChange={(e) => setManagerPassword(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter a secure password (min 6 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  If both email and password are provided, a STORE_ADMIN user account will be created.
                </p>
              </div>
            </div>
          </div>

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
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Store"}
            </button>
          </div>
        </form>
      </Drawer>
    </>
  );
}



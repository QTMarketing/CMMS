"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import Drawer from "@/components/ui/Drawer";

type StoreCategory = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
};

export default function ManageCategoriesDrawer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create category form state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Load categories when drawer opens
  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  async function loadCategories() {
    try {
      const res = await fetch("/api/store-categories", { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.data) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  }

  async function handleCreateCategory(e: FormEvent) {
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

      // Refresh categories list
      await loadCategories();
      setNewCategoryName("");
      setNewCategoryDescription("");
      setNewCategoryColor("");
    } catch (err) {
      setError("Unexpected error while creating category.");
    } finally {
      setCreatingCategory(false);
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    if (!confirm("Are you sure you want to delete this category? This will remove it from all stores.")) {
      return;
    }

    try {
      const res = await fetch(`/api/store-categories/${categoryId}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.success === false)) {
        alert(data?.error || "Failed to delete category.");
        return;
      }

      // Refresh categories list
      await loadCategories();
      router.refresh();
    } catch (err) {
      alert("Unexpected error while deleting category.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
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
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
        Manage Categories
      </button>

      <Drawer open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-4 max-w-md mx-auto">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Manage Categories</h2>
            <p className="mt-1 text-xs text-gray-500">
              Create and manage store categories. Categories help organize and filter locations.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Create new category form */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Create New Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Retail, Warehouse, Service Center"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-300 focus:outline-none"
                  placeholder="Brief description"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Color (optional)
                </label>
                <input
                  type="text"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-300 focus:outline-none"
                  placeholder="Hex color (e.g. #FF5733)"
                />
              </div>
              <button
                type="submit"
                disabled={creatingCategory}
                className="w-full rounded bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {creatingCategory ? "Creating..." : "Create Category"}
              </button>
            </form>
          </div>

          {/* Existing categories list */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Existing Categories</h3>
            {categories.length === 0 ? (
              <p className="text-xs text-gray-500">No categories created yet.</p>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-4 h-4 rounded"
                          style={{ backgroundColor: cat.color || "#3B82F6" }}
                        />
                        <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                      </div>
                      {cat.description && (
                        <p className="text-xs text-gray-500 mt-1">{cat.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="ml-3 text-red-600 hover:text-red-800 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
}

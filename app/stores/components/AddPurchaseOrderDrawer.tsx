"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import Drawer from "@/components/ui/Drawer";
import { isAdminLike, isMasterAdmin } from "@/lib/roles";

type StoreOption = {
  id: string;
  name: string;
  code?: string | null;
};

type Vendor = {
  id: string;
  name: string;
  email?: string | null;
};

type InventoryItem = {
  id: string;
  name: string;
  partNumber?: string | null;
};

interface AddPurchaseOrderDrawerProps {
  defaultStoreId?: string;
  onSuccess?: () => void;
}

type LineItem = {
  id: string;
  inventoryItemId: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

export default function AddPurchaseOrderDrawer({
  defaultStoreId,
  onSuccess,
}: AddPurchaseOrderDrawerProps = {}) {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const userStoreId = ((session?.user as any)?.storeId ?? null) as
    | string
    | null;

  const [open, setOpen] = useState(false);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState<string>(defaultStoreId || "");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [name, setName] = useState("");
  const [vendorId, setVendorId] = useState<string>("");
  const [status, setStatus] = useState<string>("Draft");
  const [neededBy, setNeededBy] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [items, setItems] = useState<LineItem[]>([
    {
      id: "1",
      inventoryItemId: "",
      description: "",
      quantity: "1",
      unitPrice: "0",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canCreate = isAdminLike(role);
  const isMaster = isMasterAdmin(role);

  useEffect(() => {
    if (!open) return;

    // Load stores only for master admin
    if (isMaster && !stores.length && !loadingStores) {
      setLoadingStores(true);
      fetch("/api/stores", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          const list = Array.isArray(data?.data) ? data.data : [];
          setStores(list);
          if (!storeId && list.length > 0) {
            setStoreId(list[0].id);
          }
        })
        .catch(() => {
          setError("Failed to load stores. Please try again.");
        })
        .finally(() => setLoadingStores(false));
    }

    // Set default store for non-master roles
    if (!isMaster && userStoreId && !storeId) {
      setStoreId(userStoreId);
    }
  }, [open, isMaster, stores.length, loadingStores, userStoreId, storeId]);

  // Load vendors and inventory for selected store
  useEffect(() => {
    if (!open || !storeId) {
      setVendors([]);
      setInventory([]);
      return;
    }

    setLoadingLookups(true);

    Promise.all([
      fetch(`/api/technicians?storeId=${encodeURIComponent(storeId)}`, {
        cache: "no-store",
      }).then((res) => res.json()),
      fetch(`/api/inventory?storeId=${encodeURIComponent(storeId)}`, {
        cache: "no-store",
      }).then((res) => res.json()),
    ])
      .then(([vendorsRes, inventoryRes]) => {
        const vendorList = Array.isArray(vendorsRes)
          ? vendorsRes
          : vendorsRes.data || [];
        const inventoryList = Array.isArray(inventoryRes)
          ? inventoryRes
          : inventoryRes.data || [];
        setVendors(vendorList);
        setInventory(inventoryList);
      })
      .catch(() => {
        setError("Failed to load vendors or parts. Please try again.");
      })
      .finally(() => setLoadingLookups(false));
  }, [open, storeId]);

  const storeOptions = useMemo(
    () =>
      stores.map((s) => ({
        id: s.id,
        label: s.code ? `${s.name} (${s.code})` : s.name,
      })),
    [stores]
  );

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);
      if (!Number.isFinite(qty) || !Number.isFinite(price)) return sum;
      return sum + qty * price;
    }, 0);
  }, [items]);

  function resetForm() {
    setName("");
    setVendorId("");
    setStatus("Draft");
    setNeededBy("");
    setNotes("");
    setItems([
      {
        id: "1",
        inventoryItemId: "",
        description: "",
        quantity: "1",
        unitPrice: "0",
      },
    ]);
    setError(null);
  }

  function validate(): string | null {
    if (!canCreate) return "You are not allowed to create purchase orders.";
    if (!name.trim()) return "PO name is required.";

    const resolvedStoreId = isMaster ? storeId || null : userStoreId;
    if (!resolvedStoreId) {
      return "Your user is not associated with a store.";
    }

    if (!items.length) return "Add at least one line item.";

    for (const item of items) {
      if (!item.description.trim()) {
        return "Each line item must have a description.";
      }
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);
      if (!Number.isFinite(qty) || qty <= 0) {
        return "Each line item must have a positive quantity.";
      }
      if (!Number.isFinite(price) || price < 0) {
        return "Each line item must have a non-negative unit price.";
      }
    }

    return null;
  }

  function addLineItem() {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        inventoryItemId: "",
        description: "",
        quantity: "1",
        unitPrice: "0",
      },
    ]);
  }

  function removeLineItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      stopPropagation;
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resolvedStoreId = isMaster ? storeId || null : userStoreId;

      const body = {
        storeId: resolvedStoreId,
        vendorId: vendorId || undefined,
        name: name.trim(),
        status,
        neededBy: neededBy || undefined,
        notes: notes.trim() || undefined,
        items: items.map((item) => ({
          inventoryItemId: item.inventoryItemId || undefined,
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      };

      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.success === false)) {
        const message =
          data?.error ||
          (res.status === 403
            ? "You are not authorized to create purchase orders."
            : "Failed to create purchase order.");
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
      setError("Unexpected error while creating purchase order.");
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
        Add PO
      </button>

      <Drawer open={open} onClose={() => setOpen(false)}>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 max-w-xl mx-auto"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Create Purchase Order
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Create a purchase order to request parts or services for this
              store.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {isMaster && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Store <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                disabled={loadingStores}
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

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              PO Name / Reference <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., Engine Overhaul Parts - April 2026"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Vendor
              </label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                disabled={loadingLookups}
              >
                <option value="">Select vendor…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.email ? `(${v.email})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Needed By (Optional)
              </label>
              <input
                type="date"
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={neededBy}
                onChange={(e) => setNeededBy(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Draft">Draft</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Approved">Approved</option>
              <option value="Ordered">Ordered</option>
              <option value="Received">Received</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-300 focus:outline-none focus:ring-0"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional instructions, shipping notes, etc."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-700">
                Line Items
              </label>
              <button
                type="button"
                onClick={addLineItem}
                className="text-xs text-blue-600 hover:underline"
              >
                + Add item
              </button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-200 rounded p-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end border-b border-gray-100 pb-2 last:border-b-0"
                >
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Part (Optional)
                    </label>
                    <select
                      className=" w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={item.inventoryItemId}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((li) =>
                            li.id === item.id
                              ? {
                                  ...li,
                                  inventoryItemId: e.target.value,
                                }
                              : li
                          )
                        )
                      }
                    >
                      <option value="">Select part…</option>
                      {inventory.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.partNumber ? `#${p.partNumber} - ` : ""}
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={item.description}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((li) =>
                            li.id === item.id
                              ? { ...li, description: e.target.value }
                              : li
                          )
                        )
                      }
                      placeholder="Describe the item"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((li) =>
                            li.id === item.id
                              ? { ...li, quantity: e.target.value }
                              : li
                          )
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((li) =>
                            li.id === item.id
                              ? { ...li, unitPrice: e.target.value }
                              : li
                          )
                        )
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between md:col-span-1">
                    <div className="text-xs text-gray-600">
                      Line Total: $
                      {(
                        (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
                      ).toFixed(2)}
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-right text-sm font-semibold text-gray-800">
              Subtotal: ${totalAmount.toFixed(2)}
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
              disabled={loading || isPending || loadingStores || loadingLookups}
            >
              {loading ? "Creating..." : "Create PO"}
            </button>
          </div>
        </form>
      </Drawer>
    </>
  );
}


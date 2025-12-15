"use client";

import { useState, useEffect } from "react";
import Drawer from "@/components/ui/Drawer";

interface Store {
  id: string;
  name: string;
  code?: string | null;
}

interface Asset {
  id: string;
  name: string;
  assetId?: number | null;
  storeId?: string | null;
}

interface InventoryItem {
  id: string;
  name: string;
  partNumber: string;
  quantityOnHand: number;
  storeId?: string | null;
}

interface TransferDrawerProps {
  open: boolean;
  onClose: () => void;
  type: "ASSET" | "INVENTORY";
  assetId?: string;
  inventoryItemId?: string;
  workOrderId?: string;
  fromStoreId?: string;
  onSuccess?: () => void;
}

export default function TransferDrawer({
  open,
  onClose,
  type,
  assetId,
  inventoryItemId,
  workOrderId,
  fromStoreId,
  onSuccess,
}: TransferDrawerProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [inventoryItem, setInventoryItem] = useState<InventoryItem | null>(null);
  const [currentFromStoreId, setCurrentFromStoreId] = useState<string | null>(fromStoreId || null);
  const [toStoreId, setToStoreId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Load stores and item data
  useEffect(() => {
    if (!open) return;

    setLoadingData(true);
    setError(null);

    Promise.all([
      fetch("/api/stores")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setStores(data.data || []);
          }
        }),
      type === "ASSET" && assetId
        ? fetch(`/api/assets/${assetId}`)
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                setAsset(data.data);
                if (data.data.storeId) {
                  setCurrentFromStoreId(data.data.storeId);
                }
              }
            })
        : Promise.resolve(),
      type === "INVENTORY" && inventoryItemId
        ? fetch(`/api/inventory/${inventoryItemId}`)
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                setInventoryItem(data.data);
                if (data.data.storeId) {
                  setCurrentFromStoreId(data.data.storeId);
                }
                setQuantity(1);
              }
            })
        : Promise.resolve(),
    ])
      .catch((err) => {
        console.error("Error loading transfer data:", err);
        setError("Failed to load data. Please try again.");
      })
      .finally(() => {
        setLoadingData(false);
      });
  }, [open, type, assetId, inventoryItemId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!toStoreId) {
      setError("Please select a destination store.");
      return;
    }

    if (type === "INVENTORY" && (!quantity || quantity <= 0)) {
      setError("Please enter a valid quantity.");
      return;
    }

    if (type === "INVENTORY" && inventoryItem && quantity > inventoryItem.quantityOnHand) {
      setError(`Insufficient quantity. Available: ${inventoryItem.quantityOnHand}`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          assetId: type === "ASSET" ? assetId : undefined,
          inventoryItemId: type === "INVENTORY" ? inventoryItemId : undefined,
          quantity: type === "INVENTORY" ? quantity : undefined,
          fromStoreId: currentFromStoreId || fromStoreId || asset?.storeId || inventoryItem?.storeId,
          toStoreId,
          workOrderId,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create transfer.");
      }

      // Reset form
      setToStoreId("");
      setQuantity(1);
      setNotes("");
      setError(null);

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (err: any) {
      console.error("Error creating transfer:", err);
      setError(err.message || "Failed to create transfer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const effectiveFromStoreId = currentFromStoreId || fromStoreId || asset?.storeId || inventoryItem?.storeId;
  const fromStore = stores.find((s) => s.id === effectiveFromStoreId);
  const availableStores = stores.filter((s) => s.id !== effectiveFromStoreId);

  return (
    <Drawer open={open} onClose={onClose} width="w-96">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Transfer {type === "ASSET" ? "Asset" : "Inventory Item"}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Move {type === "ASSET" ? "an asset" : "inventory items"} from one store to another.
          </p>
        </div>

        {loadingData ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Item Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Item</p>
              {type === "ASSET" && asset ? (
                <div>
                  <p className="font-medium text-gray-900">{asset.name}</p>
                  {asset.assetId && (
                    <p className="text-sm text-gray-600">Asset ID: {asset.assetId}</p>
                  )}
                </div>
              ) : type === "INVENTORY" && inventoryItem ? (
                <div>
                  <p className="font-medium text-gray-900">{inventoryItem.name}</p>
                  <p className="text-sm text-gray-600">Part: {inventoryItem.partNumber}</p>
                  <p className="text-sm text-gray-600">
                    Available: {inventoryItem.quantityOnHand}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Loading item details...</p>
              )}
            </div>

            {/* From Store */}
            {fromStore && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Store
                </label>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium text-gray-900">{fromStore.name}</p>
                  {fromStore.code && (
                    <p className="text-sm text-gray-600">{fromStore.code}</p>
                  )}
                </div>
              </div>
            )}

            {/* To Store */}
            <div>
              <label htmlFor="toStore" className="block text-sm font-medium text-gray-700 mb-1">
                To Store <span className="text-red-500">*</span>
              </label>
              <select
                id="toStore"
                value={toStoreId}
                onChange={(e) => setToStoreId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select destination store</option>
                {availableStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} {store.code && `(${store.code})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity (for inventory) */}
            {type === "INVENTORY" && inventoryItem && (
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="quantity"
                  min="1"
                  max={inventoryItem.quantityOnHand}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Maximum: {inventoryItem.quantityOnHand}
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Reason for transfer..."
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={loading || !toStoreId}
              >
                {loading ? "Transferring..." : "Transfer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Drawer>
  );
}


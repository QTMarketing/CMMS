"use client";

import { useState, useEffect } from "react";
import { ArrowRightLeft } from "lucide-react";
import TransferDrawer from "./TransferDrawer";

interface Transfer {
  id: string;
  type: "ASSET" | "INVENTORY";
  quantity?: number | null;
  fromStore: {
    id: string;
    name: string;
    code?: string | null;
  };
  toStore: {
    id: string;
    name: string;
    code?: string | null;
  };
  workOrder?: {
    id: string;
    title: string;
  } | null;
  transferredBy?: {
    id: string;
    email: string;
  } | null;
  notes?: string | null;
  createdAt: string;
}

interface TransferHistoryProps {
  assetId?: string;
  inventoryItemId?: string;
  workOrderId?: string;
  storeId?: string | null;
  canTransfer?: boolean;
}

export default function TransferHistory({
  assetId,
  inventoryItemId,
  workOrderId,
  storeId,
  canTransfer = false,
}: TransferHistoryProps) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransferDrawer, setShowTransferDrawer] = useState(false);

  useEffect(() => {
    if (!assetId && !inventoryItemId && !workOrderId) return;

    setLoading(true);
    const params = new URLSearchParams();
    if (assetId) params.append("assetId", assetId);
    if (inventoryItemId) params.append("inventoryItemId", inventoryItemId);
    if (workOrderId) params.append("workOrderId", workOrderId);

    fetch(`/api/transfers?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTransfers(data.data || []);
        }
      })
      .catch((err) => {
        console.error("Error loading transfers:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [assetId, inventoryItemId, workOrderId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
        <p className="text-sm text-gray-500">Loading transfer history...</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">
            Transfer History
          </h3>
          {canTransfer && (assetId || inventoryItemId) && (
            <button
              onClick={() => setShowTransferDrawer(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <ArrowRightLeft className="h-3 w-3" />
              Transfer
            </button>
          )}
        </div>

        {transfers.length === 0 ? (
          <p className="text-sm text-gray-500">
            No transfers recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {transfers.map((transfer) => (
              <div
                key={transfer.id}
                className="border border-gray-200 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {transfer.fromStore.name}
                        {transfer.fromStore.code && ` (${transfer.fromStore.code})`}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="text-sm font-medium text-gray-900">
                        {transfer.toStore.name}
                        {transfer.toStore.code && ` (${transfer.toStore.code})`}
                      </span>
                    </div>
                    {transfer.type === "INVENTORY" && transfer.quantity && (
                      <p className="text-xs text-gray-600 mt-1">
                        Quantity: {transfer.quantity}
                      </p>
                    )}
                    {transfer.workOrder && (
                      <p className="text-xs text-gray-600 mt-1">
                        Work Order:{" "}
                        <a
                          href={`/workorders/${transfer.workOrder.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {transfer.workOrder.title}
                        </a>
                      </p>
                    )}
                    {transfer.notes && (
                      <p className="text-xs text-gray-600 mt-1">
                        Notes: {transfer.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {formatDate(transfer.createdAt)}
                    </p>
                    {transfer.transferredBy && (
                      <p className="text-xs text-gray-400 mt-1">
                        by {transfer.transferredBy.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {canTransfer && (assetId || inventoryItemId) && (
        <TransferDrawer
          open={showTransferDrawer}
          onClose={() => setShowTransferDrawer(false)}
          type={assetId ? "ASSET" : "INVENTORY"}
          assetId={assetId}
          inventoryItemId={inventoryItemId}
          workOrderId={workOrderId}
          fromStoreId={storeId || undefined}
          onSuccess={() => {
            // Reload transfers
            const params = new URLSearchParams();
            if (assetId) params.append("assetId", assetId);
            if (inventoryItemId) params.append("inventoryItemId", inventoryItemId);
            if (workOrderId) params.append("workOrderId", workOrderId);

            fetch(`/api/transfers?${params.toString()}`)
              .then((res) => res.json())
              .then((data) => {
                if (data.success) {
                  setTransfers(data.data || []);
                }
              });
          }}
        />
      )}
    </>
  );
}


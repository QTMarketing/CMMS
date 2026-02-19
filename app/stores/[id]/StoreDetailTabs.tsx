"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BulkImportDrawer from "@/components/BulkImportDrawer";
import AddAssetDrawer from "@/app/assets/components/AddAssetDrawer";
import AddInventoryDrawer from "@/app/inventory/components/AddInventoryDrawer";
import AddRequestDrawer from "../components/AddRequestDrawer";
import AddPMScheduleDrawer from "../components/AddPMScheduleDrawer";
import AddPurchaseOrderDrawer from "../components/AddPurchaseOrderDrawer";

type Store = {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
};

type Asset = {
  id: string;
  name: string;
  assetId: number | null;
  location: string;
  status: string;
};

type Part = {
  id: string;
  name: string;
  partNumber: string;
  quantityOnHand: number;
  reorderThreshold: number;
  location: string | null;
};

type Request = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
};

type Schedule = {
  id: string;
  title: string;
  assetName: string | null;
  nextDueDate: string | null;
};

type PurchaseOrder = {
  id: string;
  poNumber: number;
  status: string;
  orderDate: string;
  vendorName?: string | null;
  total?: number | null;
};

type Props = {
  store: Store;
  assets: Asset[];
  parts: Part[];
  requests: Request[];
  schedules: Schedule[];
  purchaseOrders?: PurchaseOrder[];
  initialTab?: string;
};

const tabs = ["Assets", "Parts", "Requests", "Preventive Maintenance", "Purchase Orders"] as const;

export default function StoreDetailTabs({
  store,
  assets,
  parts,
  requests,
  schedules,
  purchaseOrders = [],
  initialTab,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get("tab") || undefined;
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>(
    (initialTab && tabs.includes(initialTab as any)) ? (initialTab as (typeof tabs)[number]) : "Assets"
  );

  // Sync tab when URL ?tab= changes (e.g. from StoreTree links)
  useEffect(() => {
    if (tabFromUrl && tabs.includes(tabFromUrl as any)) {
      setActiveTab(tabFromUrl as (typeof tabs)[number]);
    }
  }, [tabFromUrl]);

  const locationLabel =
    (store.city && store.state
      ? `${store.city}, ${store.state}`
      : store.city || store.state || "") || "—";

  return (
    <div className="px-2 sm:px-4 md:px-6 py-4 md:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {store.name}
          </h1>
          <p className="text-sm text-gray-600">
            Store code:{" "}
            <span className="font-mono">
              {store.code || store.id.slice(0, 8).toUpperCase()}
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Location: {locationLabel}
            {store.zipCode ? ` (${store.zipCode})` : ""}
          </p>
        </div>
        <Link
          href="/stores"
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          ← Back to Stores
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-2" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium sm:text-sm ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
        {activeTab === "Assets" && (
          <AssetsTab assets={assets} storeId={store.id} />
        )}
        {activeTab === "Parts" && (
          <PartsTab parts={parts} storeId={store.id} />
        )}
        {activeTab === "Requests" && (
          <RequestsTab requests={requests} storeId={store.id} />
        )}
        {activeTab === "Preventive Maintenance" && (
          <PmTab schedules={schedules} storeId={store.id} />
        )}
        {activeTab === "Purchase Orders" && (
          <PurchaseOrdersTab purchaseOrders={purchaseOrders} storeId={store.id} />
        )}
      </div>
    </div>
  );
}

function AssetsTab({ assets, storeId }: { assets: Asset[]; storeId: string }) {
  const router = useRouter();

  const handleImportSuccess = () => {
    router.refresh();
  };

  const handleAddSuccess = () => {
    router.refresh();
  };

  if (assets.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold text-gray-900">
            Assets in this Store
          </h2>
          <div className="flex items-center gap-2">
            <AddAssetDrawer 
              defaultStoreId={storeId}
              onSuccess={handleAddSuccess}
            />
            <BulkImportDrawer 
              type="assets" 
              onSuccess={handleImportSuccess}
              defaultStoreId={storeId}
            />
          </div>
        </div>
        <p className="text-sm text-gray-500">
          No assets found for this store. Add or import assets to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-gray-900">
          Assets in this Store
        </h2>
        <div className="flex items-center gap-2">
          <AddAssetDrawer 
            defaultStoreId={storeId}
            onSuccess={handleAddSuccess}
          />
          <BulkImportDrawer 
            type="assets" 
            onSuccess={handleImportSuccess}
            defaultStoreId={storeId}
          />
          <Link
            href="/assets"
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            Go to Assets page →
          </Link>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs sm:text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Asset ID
              </th>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Name
              </th>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Location
              </th>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Status
              </th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {assets.map((asset) => (
              <tr key={asset.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-gray-600">
                  {asset.assetId ?? "—"}
                </td>
                <td className="px-3 py-2 text-gray-900 font-medium">
                  {asset.name}
                </td>
                <td className="px-3 py-2 text-gray-600">
                  {asset.location}
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {asset.status}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/assets/${asset.id}`}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PartsTab({ parts, storeId }: { parts: Part[]; storeId: string }) {
  const router = useRouter();

  const handleAddSuccess = () => {
    router.refresh();
  };

  const handleImportSuccess = () => {
    router.refresh();
  };

  if (parts.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold text-gray-900">
            Parts in this Store
          </h2>
          <div className="flex items-center gap-2">
            <AddInventoryDrawer 
              defaultStoreId={storeId}
              onSuccess={handleAddSuccess}
            />
            <BulkImportDrawer 
              type="inventory" 
              onSuccess={handleImportSuccess}
              defaultStoreId={storeId}
            />
          </div>
        </div>
        <p className="text-sm text-gray-500">
          No parts found for this store. Add or import parts to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-gray-900">
          Parts in this Store
        </h2>
        <div className="flex items-center gap-2">
          <AddInventoryDrawer 
            defaultStoreId={storeId}
            onSuccess={handleAddSuccess}
          />
          <BulkImportDrawer 
            type="inventory" 
            onSuccess={handleImportSuccess}
            defaultStoreId={storeId}
          />
          <Link
            href="/inventory"
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            Go to Parts page →
          </Link>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs sm:text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Name
              </th>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Part #
              </th>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Qty
              </th>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Threshold
              </th>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Location
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {parts.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-900 font-medium">
                  {p.name}
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {p.partNumber}
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {p.quantityOnHand}
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {p.reorderThreshold}
                </td>
                <td className="px-3 py-2 text-gray-600">
                  {p.location || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RequestsTab({ requests, storeId }: { requests: Request[]; storeId: string }) {
  const router = useRouter();

  const handleAddSuccess = () => {
    router.refresh();
  };

  if (requests.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold text-gray-900">
            Maintenance Requests
          </h2>
          <AddRequestDrawer 
            defaultStoreId={storeId}
            onSuccess={handleAddSuccess}
          />
        </div>
        <p className="text-sm text-gray-500">
          No maintenance requests for this store. Add a request to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-gray-900">
          Maintenance Requests
        </h2>
        <div className="flex items-center gap-2">
          <AddRequestDrawer 
            defaultStoreId={storeId}
            onSuccess={handleAddSuccess}
          />
          <Link
            href="/requests"
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            Go to Requests page →
          </Link>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs sm:text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Request ID
              </th>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Title
              </th>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Status
              </th>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {requests.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-gray-600">
                  {r.id}
                </td>
                <td className="px-3 py-2 text-gray-900 font-medium">
                  {r.title}
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {r.status}
                </td>
                <td className="px-3 py-2 text-gray-600">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PmTab({ schedules, storeId }: { schedules: Schedule[]; storeId: string }) {
  const router = useRouter();

  const handleAddSuccess = () => {
    router.refresh();
  };

  if (schedules.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold text-gray-900">
            Preventive Maintenance
          </h2>
          <AddPMScheduleDrawer 
            defaultStoreId={storeId}
            onSuccess={handleAddSuccess}
          />
        </div>
        <p className="text-sm text-gray-500">
          No preventive maintenance schedules for this store. Add a schedule to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-gray-900">
          Preventive Maintenance
        </h2>
        <div className="flex items-center gap-2">
          <AddPMScheduleDrawer 
            defaultStoreId={storeId}
            onSuccess={handleAddSuccess}
          />
          <Link
            href="/pm"
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            Go to PM page →
          </Link>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs sm:text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Schedule ID
              </th>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Title
              </th>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Asset
              </th>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Next Due Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {schedules.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-gray-600">
                  {s.id}
                </td>
                <td className="px-3 py-2 text-gray-900 font-medium">
                  {s.title}
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {s.assetName || "—"}
                </td>
                <td className="px-3 py-2 text-gray-600">
                  {s.nextDueDate
                    ? new Date(s.nextDueDate).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PurchaseOrdersTab({
  purchaseOrders,
  storeId,
}: {
  purchaseOrders: PurchaseOrder[];
  storeId: string;
}) {
  const router = useRouter();

  const handleAddSuccess = () => {
    router.refresh();
  };

  if (!purchaseOrders.length) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold text-gray-900">
            Purchase Orders
          </h2>
          <AddPurchaseOrderDrawer
            defaultStoreId={storeId}
            onSuccess={handleAddSuccess}
          />
        </div>
        <p className="text-sm text-gray-500">
          No purchase orders for this store. Create a PO to start tracking purchases for assets and parts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-gray-900">
          Purchase Orders
        </h2>
        <div className="flex items-center gap-2">
          <AddPurchaseOrderDrawer
            defaultStoreId={storeId}
            onSuccess={handleAddSuccess}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs sm:text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 font-semibold text-gray-600">
                PO #
              </th>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Vendor
              </th>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Status
              </th>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Date
              </th>
              <th className="px-3 py-2 font-semibold text-gray-600">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {purchaseOrders.map((po) => (
              <tr key={po.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-gray-700">
                  {po.poNumber}
                </td>
                <td className="px-3 py-2 text-gray-900">
                  {po.vendorName || "—"}
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {po.status}
                </td>
                <td className="px-3 py-2 text-gray-600">
                  {po.orderDate
                    ? new Date(po.orderDate).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-3 py-2 text-gray-900">
                  {typeof po.total === "number"
                    ? `$${po.total.toFixed(2)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



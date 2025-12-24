"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import EditStoreDrawer from "./EditStoreDrawer";
import QRCodeModal from "./QRCodeModal";

type Store = {
  id: string;
  name: string;
  code: string | null;
  // Match server/store shape, including optional address
  address?: string | null;
  city: string | null;
  state: string | null;
  zipCode?: string | null;
  createdAt: Date | string;
  users?: {
    email: string;
    role: string;
  }[];
};

type StoresTableProps = {
  stores: Store[];
};

export default function StoresTable({ stores }: StoresTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [storeTypeFilter, setStoreTypeFilter] = useState("All");
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null);
  const [qrStoreId, setQrStoreId] = useState<string | null>(null);
  const [qrStoreName, setQrStoreName] = useState<string>("");
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Get unique locations for filter
  const locations = useMemo(() => {
    const locs = new Set<string>();
    stores.forEach((store) => {
      if (store.city && store.state) {
        locs.add(`${store.city}, ${store.state}`);
      } else if (store.city) {
        locs.add(store.city);
      } else if (store.state) {
        locs.add(store.state);
      }
    });
    return Array.from(locs).sort();
  }, [stores]);

  // Filter stores
  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        store.name.toLowerCase().includes(searchLower) ||
        store.id.toLowerCase().includes(searchLower) ||
        store.code?.toLowerCase().includes(searchLower) ||
        `${store.city}, ${store.state}`.toLowerCase().includes(searchLower);

      // Location filter
      const location = store.city && store.state 
        ? `${store.city}, ${store.state}` 
        : store.city || store.state || "";
      const matchesLocation =
        locationFilter === "All" || location === locationFilter;

      return matchesSearch && matchesLocation;
    });
  }, [stores, searchQuery, locationFilter]);

  // Get store manager email (first STORE_ADMIN user)
  const getStoreManagerEmail = (store: Store): string => {
    if (store.users && store.users.length > 0) {
      const manager = store.users.find((u) => u.role === "STORE_ADMIN");
      return manager?.email || store.users[0]?.email || "—";
    }
    return "—";
  };

  // Format store ID
  const formatStoreId = (id: string): string => {
    // Use code if available, otherwise format the ID
    return id.substring(0, 8).toUpperCase();
  };

  // Format location
  const formatLocation = (store: Store): string => {
    if (store.city && store.state) {
      return `${store.city}, ${store.state}`;
    }
    return store.city || store.state || "—";
  };

  // Format date
  const formatDate = (date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setIsEditDrawerOpen(true);
  };

  const handleDelete = async (storeId: string) => {
    if (!confirm("Are you sure you want to delete this store? This action cannot be undone.")) {
      return;
    }

    setDeletingStoreId(storeId);
    try {
      const res = await fetch(`/api/stores/${storeId}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.success === false)) {
        alert(data?.error || "Failed to delete store.");
        return;
      }

      router.refresh();
    } catch (err) {
      alert("Unexpected error while deleting store.");
    } finally {
      setDeletingStoreId(null);
    }
  };

  return (
    <>
      <div className="bg-white rounded shadow-sm">
        <div className="p-6 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-grow max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded bg-gray-50 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search by store name, ID, location..."
            />
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto border border-gray-300 rounded bg-gray-50 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3"
            >
              <option>Status: All</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full sm:w-auto border border-gray-300 rounded bg-gray-50 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3"
            >
              <option>Location: All</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            <select
              value={storeTypeFilter}
              onChange={(e) => setStoreTypeFilter(e.target.value)}
              className="w-full sm:w-auto border border-gray-300 rounded bg-gray-50 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3"
            >
              <option>Store Type: All</option>
              <option>Retail</option>
              <option>Warehouse</option>
              <option>Service Center</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Store ID</th>
                <th className="p-4 font-semibold text-gray-600">Store Name</th>
                <th className="p-4 font-semibold text-gray-600">Location</th>
                <th className="p-4 font-semibold text-gray-600">Status</th>
                <th className="p-4 font-semibold text-gray-600">Manager</th>
                <th className="p-4 font-semibold text-gray-600">Creation Date</th>
                <th className="p-4 font-semibold text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStores.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-4 text-center text-sm text-gray-500"
                  >
                    No stores found.
                  </td>
                </tr>
              ) : (
                filteredStores.map((store) => (
                  <tr
                    key={store.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/stores/${store.id}`)}
                  >
                    <td className="p-4 text-gray-500 font-mono">
                      {store.code || `#ST-${formatStoreId(store.id)}`}
                    </td>
                    <td className="p-4 text-gray-900 font-medium">
                      {store.name}
                    </td>
                    <td className="p-4 text-gray-600">
                      {formatLocation(store)}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm">{getStoreManagerEmail(store)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setQrStoreId(store.id);
                            setQrStoreName(store.name);
                            setIsQRModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          View QR Code
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">
                      {formatDate(store.createdAt)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-4 text-gray-500" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setQrStoreId(store.id);
                            setQrStoreName(store.name);
                            setIsQRModalOpen(true);
                          }}
                          className="hover:text-green-600"
                          title="View QR Code"
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
                              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(store);
                          }}
                          className="hover:text-blue-600"
                          title="Edit"
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(store.id);
                          }}
                          disabled={deletingStoreId === store.id}
                          className="hover:text-red-600 disabled:opacity-50"
                          title="Delete"
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EditStoreDrawer
        store={editingStore}
        open={isEditDrawerOpen}
        onClose={() => {
          setIsEditDrawerOpen(false);
          setEditingStore(null);
        }}
      />

      <QRCodeModal
        storeId={qrStoreId || ""}
        storeName={qrStoreName}
        open={isQRModalOpen}
        onClose={() => {
          setIsQRModalOpen(false);
          setQrStoreId(null);
          setQrStoreName("");
        }}
      />
    </>
  );
}


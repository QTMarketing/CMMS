"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Badge from "../../components/ui/Badge";
import AddInventoryDrawer from "./components/AddInventoryDrawer";
import StoreFilter from "@/components/StoreFilter";
import BulkImportDrawer from "@/components/BulkImportDrawer";
import { isAdminLike } from "@/lib/roles";

export default function PartsPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [parts, setParts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const searchParams = useSearchParams();
  const selectedStoreId = searchParams.get("storeId") || "";
  const role = (session?.user as any)?.role as string | undefined;
  const isAdmin = isAdminLike(role);
  const isTechnician = role === "TECHNICIAN";
  const isStoreAdmin = role === "STORE_ADMIN";
  const isSessionLoading = sessionStatus === "loading";

  // Redirect technicians and STORE_ADMIN away from this page
  useEffect(() => {
    if (!isSessionLoading) {
      if (isTechnician) {
        router.push("/");
      } else if (isStoreAdmin) {
        router.push("/workorders");
      }
    }
  }, [isSessionLoading, isTechnician, isStoreAdmin, router]);

  // Show nothing while redirecting technicians or STORE_ADMIN
  if ((isTechnician || isStoreAdmin) && !isSessionLoading) {
    return null;
  }

  useEffect(() => {
    const qs = selectedStoreId
      ? `?storeId=${encodeURIComponent(selectedStoreId)}`
      : "";

    fetch(`/api/inventory${qs}`, { cache: "no-store" })
      .then(async (res) => {
        const text = await res.text().catch(() => "");
        if (!text) {
          return { data: [] };
        }
        try {
          return JSON.parse(text);
        } catch {
          console.error(
            "Failed to parse /api/inventory response as JSON:",
            text
          );
          return { data: [] };
        }
      })
      .then((data) =>
        setParts(Array.isArray(data) ? data : data.data || [])
      );

    fetch("/api/stores", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) =>
        setStores(Array.isArray(data?.data) ? data.data : [])
      )
      .catch(() => {});
  }, [selectedStoreId]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortValue = (item: any, column: string): string | number => {
    switch (column) {
      case "id":
        return item.id?.toString() || "";
      case "name":
        return item.name?.toLowerCase() || "";
      case "partNumber":
        return item.partNumber?.toLowerCase() || "";
      case "quantity":
        return item.quantityOnHand || 0;
      case "threshold":
        return item.reorderThreshold || 0;
      case "location":
        return item.location?.toLowerCase() || "";
      case "lowStock":
        return item.quantityOnHand <= item.reorderThreshold ? 1 : 0;
      default:
        return "";
    }
  };

  // Sort by name ASC (default) or by selected column
  const rows = useMemo(() => {
    const mapped = parts.map((item) => ({
      ...item,
      lowStock: item.quantityOnHand <= item.reorderThreshold,
    }));

    if (!sortColumn) {
      // Default sort by name
      return mapped.sort((a, b) => a.name.localeCompare(b.name));
    }

    return mapped.sort((a, b) => {
      const aVal = getSortValue(a, sortColumn);
      const bVal = getSortValue(b, sortColumn);
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      const comparison = aStr.localeCompare(bStr);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [parts, sortColumn, sortDirection]);

  const filtered = showLowStockOnly ? rows.filter((r) => r.lowStock) : rows;

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <div className="flex items-center mb-2 gap-3 justify-between">
        {/* Filter Toggle */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm select-none">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={() => setShowLowStockOnly((v) => !v)}
            />
            Show Low Stock Only
          </label>
          <span className="text-gray-400 text-xs">
            {filtered.length} items
          </span>
        </div>
        <div className="flex items-center gap-3">
          {stores.length > 0 && (
            <StoreFilter
              stores={stores}
              selectedStoreId={selectedStoreId || null}
              label="Store"
            />
          )}
          <div className="flex items-center gap-2">
            <BulkImportDrawer type="inventory" />
          <AddInventoryDrawer />
          </div>
        </div>
      </div>
      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm w-full overflow-x-auto">
        <table className="min-w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <th
                className="px-4 py-2 text-left cursor-pointer hover:bg-slate-100 select-none"
                onClick={() => handleSort("id")}
              >
                <div className="flex items-center gap-1">
                  ID
                  {sortColumn === "id" && (
                    <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
              <th
                className="px-4 py-2 text-left cursor-pointer hover:bg-slate-100 select-none"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1">
                  Name
                  {sortColumn === "name" && (
                    <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
              <th
                className="px-4 py-2 text-left cursor-pointer hover:bg-slate-100 select-none"
                onClick={() => handleSort("partNumber")}
              >
                <div className="flex items-center gap-1">
                  Part #
                  {sortColumn === "partNumber" && (
                    <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
              <th
                className="px-4 py-2 text-left cursor-pointer hover:bg-slate-100 select-none"
                onClick={() => handleSort("quantity")}
              >
                <div className="flex items-center gap-1">
                  Qty
                  {sortColumn === "quantity" && (
                    <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
              <th
                className="px-4 py-2 text-left cursor-pointer hover:bg-slate-100 select-none"
                onClick={() => handleSort("threshold")}
              >
                <div className="flex items-center gap-1">
                  Threshold
                  {sortColumn === "threshold" && (
                    <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
              <th
                className="px-4 py-2 text-left cursor-pointer hover:bg-slate-100 select-none"
                onClick={() => handleSort("location")}
              >
                <div className="flex items-center gap-1">
                  Location
                  {sortColumn === "location" && (
                    <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
              <th
                className="px-4 py-2 text-left cursor-pointer hover:bg-slate-100 select-none"
                onClick={() => handleSort("lowStock")}
              >
                <div className="flex items-center gap-1">
                  Low Stock
                  {sortColumn === "lowStock" && (
                    <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  No parts found.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-slate-100 ${
                    item.lowStock ? "bg-red-50" : ""
                  }`}
                >
                  <td className="px-4 py-2">{item.id}</td>
                  <td className="px-4 py-2">{item.name}</td>
                  <td className="px-4 py-2">{item.partNumber}</td>
                  <td className="px-4 py-2">{item.quantityOnHand}</td>
                  <td className="px-4 py-2">{item.reorderThreshold}</td>
                  <td className="px-4 py-2">{item.location || "—"}</td>
                  <td className="px-4 py-2">
                    {item.lowStock ? (
                      <Badge colorClass="bg-red-100 text-red-600">LOW</Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const confirmed = window.confirm(
                            "Delete this part? This cannot be undone."
                          );
                          if (!confirmed) return;

                          try {
                            const res = await fetch(
                              `/api/inventory/${encodeURIComponent(item.id)}`,
                              { method: "DELETE" }
                            );

                            if (!res.ok) {
                              const data = await res
                                .json()
                                .catch(() => ({}));
                              window.alert(
                                `Failed to delete part: ${
                                  data.error ?? "Unknown error"
                                }`
                              );
                              return;
                            }

                            router.refresh();
                          } catch (err) {
                            console.error("Failed to delete part", err);
                            window.alert("Failed to delete part.");
                          }
                        }}
                        className="text-slate-400 hover:text-red-500"
                        aria-label="Delete part"
                      >
                        🗑
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

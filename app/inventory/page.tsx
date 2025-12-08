"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Badge from "../../components/ui/Badge";
import Table from "../../components/ui/Table";
import AddInventoryDrawer from "./components/AddInventoryDrawer";
import StoreFilter from "@/components/StoreFilter";
import { isAdminLike } from "@/lib/roles";

export default function InventoryPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [stores, setStores] = useState<any[]>([]);
  const searchParams = useSearchParams();
  const selectedStoreId = searchParams.get("storeId") || "";
  const role = (session?.user as any)?.role as string | undefined;
  const isAdmin = isAdminLike(role);
  const isTechnician = role === "TECHNICIAN";
  const isSessionLoading = sessionStatus === "loading";

  // Redirect technicians away from this page
  useEffect(() => {
    if (!isSessionLoading && isTechnician) {
      router.push("/");
    }
  }, [isSessionLoading, isTechnician, router]);

  // Show nothing while redirecting technicians
  if (isTechnician && !isSessionLoading) {
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
        setInventory(Array.isArray(data) ? data : data.data || [])
      );

    fetch("/api/stores", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) =>
        setStores(Array.isArray(data?.data) ? data.data : [])
      )
      .catch(() => {});
  }, [selectedStoreId]);

  // Sort by name ASC
  const rows = inventory
    .map((item) => ({
      ...item,
      lowStock: item.quantityOnHand <= item.reorderThreshold,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

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
          <AddInventoryDrawer />
        </div>
      </div>
      {/* Table */}
      <Table
        headers={[
          "ID",
          "Name",
          "Part #",
          "Qty",
          "Threshold",
          "Location",
          "Low Stock",
          "Actions",
        ]}
      >
        {filtered.length === 0 ? (
          <tr>
            <td colSpan={8} className="py-6 text-center text-gray-400">
              No inventory items found.
            </td>
          </tr>
        ) : (
          filtered.map((item) => (
            <tr
              key={item.id}
              className={item.lowStock ? "bg-red-50" : ""}
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
                        "Delete this inventory item? This cannot be undone."
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
                            `Failed to delete inventory item: ${
                              data.error ?? "Unknown error"
                            }`
                          );
                          return;
                        }

                        router.refresh();
                      } catch (err) {
                        console.error("Failed to delete inventory item", err);
                        window.alert("Failed to delete inventory item.");
                      }
                    }}
                    className="text-slate-400 hover:text-red-500"
                    aria-label="Delete inventory item"
                  >
                    🗑
                  </button>
                )}
              </td>
            </tr>
          ))
        )}
      </Table>
    </div>
  );
}

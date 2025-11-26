"use client";

import { useState, useEffect } from "react";
import Badge from "../../components/ui/Badge";
import Table from "../../components/ui/Table";

export default function InventoryPage() {
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    fetch("/api/inventory", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setInventory(Array.isArray(data) ? data : data.data || []));
  }, []);

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
      {/* Filter Toggle */}
      <div className="flex items-center mb-2 gap-3">
        <label className="flex items-center gap-2 text-sm select-none">
          <input
            type="checkbox"
            checked={showLowStockOnly}
            onChange={() => setShowLowStockOnly((v) => !v)}
          />
          Show Low Stock Only
        </label>
        <span className="text-gray-400 text-xs">{filtered.length} items</span>
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
        ]}
      >
        {filtered.length === 0 ? (
          <tr>
            <td colSpan={7} className="py-6 text-center text-gray-400">
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
            </tr>
          ))
        )}
      </Table>
    </div>
  );
}

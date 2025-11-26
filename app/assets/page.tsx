"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Badge from "../../components/ui/Badge";
import Table from "../../components/ui/Table";

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-600",
  Down: "bg-red-100 text-red-600",
  Retired: "bg-gray-200 text-gray-600",
};

type DateInput = string | Date | null | undefined;

function formatDate(date: DateInput) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString();
}

function nextDueDays(nextDate?: string) {
  if (!nextDate) return "—";
  const now = new Date();
  const next = new Date(nextDate);
  const delta = Math.ceil(
    (next.getTime() - now.getTime()) / (1000 * 3600 * 24)
  );
  if (isNaN(delta)) return "—";
  return delta >= 0 ? delta.toString() : `Overdue (${Math.abs(delta)})`;
}

export default function AssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/assets", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setAssets(Array.isArray(data) ? data : data.data || []));

    // Load work orders once so we can compute per-asset workload counts
    fetch("/api/workorders", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) =>
        setWorkOrders(Array.isArray(data) ? data : data.data || [])
      );
  }, []);

  const countsByAsset: Record<
    string,
    {
      total: number;
      open: number;
    }
  > = {};

  for (const wo of workOrders) {
    if (!wo || !wo.assetId) continue;
    const existing = countsByAsset[wo.assetId] || { total: 0, open: 0 };
    existing.total += 1;
    if (wo.status === "Open") existing.open += 1;
    countsByAsset[wo.assetId] = existing;
  }

  const sorted = [...assets].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <Table
        headers={[
          "Asset ID",
          "Name",
          "Location",
          "Status",
          "Last Maint.",
          "Next Maint.",
          "Next Due (days)",
          "Total WOs",
          "Open WOs",
        ]}
      >
        {sorted.length === 0 ? (
          <tr>
            <td colSpan={9} className="py-6 text-center text-gray-400">
              No assets found.
            </td>
          </tr>
        ) : (
          sorted.map((a) => {
            const counts = countsByAsset[a.id] || { total: 0, open: 0 };
            return (
              <tr
                key={a.id}
                className={
                  `hover:bg-gray-50 cursor-pointer transition` +
                  (a.status === "Down" ? " bg-red-50" : "")
                }
                // Row click now navigates to the SAME asset history page
                // as the name link, so there is a single source of truth.
                onClick={() => router.push(`/assets/${a.id}`)}
              >
                <td className="px-4 py-2">{a.id}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <Link
                    href={`/assets/${a.id}`}
                    className="text-blue-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {a.name}
                  </Link>
                </td>
                <td className="px-4 py-2">{a.location}</td>
                <td className="px-4 py-2">
                  <Badge colorClass={statusColors[a.status]}>
                    {a.status}
                  </Badge>
                </td>
                <td className="px-4 py-2">
                  {formatDate(a.lastMaintenanceDate)}
                </td>
                <td className="px-4 py-2">
                  {formatDate(a.nextMaintenanceDate)}
                </td>
                <td className="px-4 py-2">
                  {nextDueDays(a.nextMaintenanceDate)}
                </td>
                <td className="px-4 py-2">{counts.total}</td>
                <td className="px-4 py-2">{counts.open}</td>
              </tr>
            );
          })
        )}
      </Table>
    </div>
  );
}

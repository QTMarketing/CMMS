"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Badge from "../../components/ui/Badge";
import Table from "../../components/ui/Table";
import AddAssetDrawer from "./components/AddAssetDrawer";
import StoreFilter from "@/components/StoreFilter";
import { isAdminLike } from "@/lib/roles";

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
  const { data: session } = useSession();
  const [assets, setAssets] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [pmSummaries, setPmSummaries] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const searchParams = useSearchParams();
  const selectedStoreId = searchParams.get("storeId") || "";
  const role = (session?.user as any)?.role as string | undefined;
  const isAdmin = isAdminLike(role);

  useEffect(() => {
    const qs = selectedStoreId
      ? `?storeId=${encodeURIComponent(selectedStoreId)}`
      : "";

    fetch(`/api/assets${qs}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setAssets(Array.isArray(data) ? data : data.data || []));

    // Load work orders once so we can compute per-asset workload counts
    fetch(`/api/workorders${qs}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) =>
        setWorkOrders(Array.isArray(data) ? data : data.data || [])
      );

    // Load preventive schedules so we can show a light PM status indicator per asset
    fetch(`/api/schedules${qs}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) =>
        setPmSummaries(Array.isArray(data) ? data : data.data || [])
      );

    fetch("/api/stores", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) =>
        setStores(Array.isArray(data?.data) ? data.data : [])
      )
      .catch(() => {});
  }, [selectedStoreId]);

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

  // Build a quick PM status summary per asset using daysUntilDue / due flags from /api/schedules
  const pmByAsset: Record<
    string,
    { hasPm: boolean; status: "on-track" | "due-soon" | "overdue" }
  > = {};

  for (const pm of pmSummaries as any[]) {
    const assetId = pm.assetId;
    if (!assetId) continue;

    const current = pmByAsset[assetId] || {
      hasPm: false,
      status: "on-track" as const,
    };

    current.hasPm = true;

    const daysUntilDue = pm.daysUntilDue;
    const isDue = pm.due; // from API: true when daysUntilDue <= 0 and active

    if (isDue) {
      current.status = "overdue";
    } else if (typeof daysUntilDue === "number" && daysUntilDue <= 7) {
      // within a week
      if (current.status !== "overdue") {
        current.status = "due-soon";
      }
    }

    pmByAsset[assetId] = current;
  }

  const sorted = [...assets].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          {stores.length > 0 && (
            <StoreFilter
              stores={stores}
              selectedStoreId={selectedStoreId || null}
              label="Store"
            />
          )}
        </div>
        <AddAssetDrawer />
      </div>
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
          "PM",
          "Actions",
        ]}
      >
        {sorted.length === 0 ? (
          <tr>
            <td colSpan={10} className="py-6 text-center text-gray-400">
              No assets found.
            </td>
          </tr>
        ) : (
          sorted.map((a) => {
            const counts = countsByAsset[a.id] || { total: 0, open: 0 };
            const pm = pmByAsset[a.id];
            let pmLabel = "";
            let pmClass = "";
            if (pm?.hasPm) {
              if (pm.status === "overdue") {
                pmLabel = "PM Overdue";
                pmClass = "bg-red-50 text-red-700";
              } else if (pm.status === "due-soon") {
                pmLabel = "PM Due";
                pmClass = "bg-amber-50 text-amber-700";
              } else {
                pmLabel = "PM";
                pmClass = "bg-gray-100 text-gray-600";
              }
            }
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
                <td className="px-4 py-2">
                  {pm && pmLabel && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${pmClass}`}
                    >
                      {pmLabel}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const confirmed = window.confirm(
                          "Delete this asset? This cannot be undone."
                        );
                        if (!confirmed) return;

                        try {
                          const res = await fetch(
                            `/api/assets/${encodeURIComponent(a.id)}`,
                            { method: "DELETE" }
                          );

                          if (!res.ok) {
                            const data = await res.json().catch(() => ({}));
                            window.alert(
                              `Failed to delete asset: ${
                                data.error ?? "Unknown error"
                              }`
                            );
                            return;
                          }

                          router.refresh();
                        } catch (err) {
                          console.error("Failed to delete asset", err);
                          window.alert("Failed to delete asset.");
                        }
                      }}
                      className="text-slate-400 hover:text-red-500"
                      aria-label="Delete asset"
                    >
                      🗑
                    </button>
                  )}
                </td>
              </tr>
            );
          })
        )}
      </Table>
    </div>
  );
}

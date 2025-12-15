"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

interface Store {
  id: string;
  name: string;
  code?: string | null;
}

interface Report {
  filename: string;
  url: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
}

export default function ReportsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role as string | undefined;
  const isMasterAdmin = role === "MASTER_ADMIN";
  const isSessionLoading = sessionStatus === "loading";

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Redirect non-master admins
  useEffect(() => {
    if (!isSessionLoading && !isMasterAdmin) {
      router.push("/");
    }
  }, [isSessionLoading, isMasterAdmin, router]);

  // Load stores
  useEffect(() => {
    if (!isMasterAdmin) return;

    setLoadingStores(true);
    fetch("/api/stores", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch stores");
        }
        return res.json();
      })
      .then((data) => {
        const storeList = Array.isArray(data?.data) ? data.data : [];
        setStores(storeList);
        if (storeList.length > 0 && !selectedStoreId) {
          setSelectedStoreId(storeList[0].id);
        }
      })
      .catch((err) => {
        console.error("Error fetching stores:", err);
        setError("Failed to load stores");
      })
      .finally(() => setLoadingStores(false));
  }, [isMasterAdmin, selectedStoreId]);

  // Load reports when store is selected
  useEffect(() => {
    if (!isMasterAdmin || !selectedStoreId) {
      setReports([]);
      return;
    }

    setLoadingReports(true);
    fetch(`/api/reports/list?storeId=${selectedStoreId}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch reports");
        }
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          setReports(Array.isArray(data.data) ? data.data : []);
        }
      })
      .catch((err) => {
        console.error("Error fetching reports:", err);
        setError("Failed to load reports");
      })
      .finally(() => setLoadingReports(false));
  }, [isMasterAdmin, selectedStoreId]);

  async function handleGenerateReport() {
    if (!selectedStoreId) {
      setError("Please select a store");
      return;
    }

    setGeneratingReport(true);
    setError(null);

    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: selectedStoreId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate report");
      }

      // Refresh reports list
      const reportsRes = await fetch(`/api/reports/list?storeId=${selectedStoreId}`, {
        cache: "no-store",
      });
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        if (reportsData.success) {
          setReports(Array.isArray(reportsData.data) ? reportsData.data : []);
        }
      }

      // Reset date inputs
      setStartDate("");
      setEndDate("");
    } catch (err: any) {
      setError(err.message || "Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  if (isSessionLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!isMasterAdmin) {
    return null;
  }

  const selectedStore = stores.find((s) => s.id === selectedStoreId);

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <DashboardHeader
        email={(session?.user as any)?.email || ""}
        pendingCount={0}
        overdueCount={0}
        scheduledMaintenanceCount={0}
        searchItems={[]}
      />

      {/* Page Header */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          Store Reports
        </h1>
        <p className="text-sm text-slate-600">
          Generate and download reports for individual stores. Reports include work orders, assets, preventive maintenance schedules, and technician information.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Store Selection and Report Generation */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Generate New Report
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Store <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              disabled={loadingStores}
            >
              <option value="">
                {loadingStores ? "Loading stores..." : "Select a store..."}
              </option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.code ? `${store.name} (${store.code})` : store.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Date (Optional)
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Leave empty for last 30 days
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                End Date (Optional)
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Leave empty for today
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={!selectedStoreId || generatingReport}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="text-sm" aria-hidden="true">
              📄
            </span>
            {generatingReport ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {/* Reports List */}
      {selectedStoreId && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Available Reports
              </h2>
              {selectedStore && (
                <span className="text-sm text-slate-600">
                  {selectedStore.code ? `${selectedStore.name} (${selectedStore.code})` : selectedStore.name}
                </span>
              )}
            </div>
          </div>

          <div className="p-6">
            {loadingReports ? (
              <p className="text-sm text-slate-500">Loading reports...</p>
            ) : reports.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                No reports available for this store. Generate a report to get started.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-medium uppercase text-slate-500">
                    <tr>
                      <th className="p-4">Report Name</th>
                      <th className="p-4">Size</th>
                      <th className="p-4">Created</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reports.map((report, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400" aria-hidden="true">
                              📄
                            </span>
                            <span className="font-medium text-slate-900">
                              {report.filename}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600">
                          {formatFileSize(report.size)}
                        </td>
                        <td className="p-4 text-slate-600">
                          {formatDate(report.createdAt)}
                        </td>
                        <td className="p-4">
                          <a
                            href={report.url}
                            download
                            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                          >
                            <span className="text-xs" aria-hidden="true">
                              ⬇
                            </span>
                            Download
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


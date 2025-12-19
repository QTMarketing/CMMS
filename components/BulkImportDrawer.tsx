"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import Drawer from "@/components/ui/Drawer";
import { isAdminLike, isMasterAdmin, isStoreAdmin } from "@/lib/roles";

type StoreOption = {
  id: string;
  name: string;
  code?: string | null;
};

interface BulkImportDrawerProps {
  type: "assets" | "inventory";
  onSuccess?: () => void;
  defaultStoreId?: string; // Add this prop
}

export default function BulkImportDrawer({ 
  type, 
  onSuccess,
  defaultStoreId 
}: BulkImportDrawerProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const userStoreId = ((session?.user as any)?.storeId ?? null) as string | null;

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const canImport = isAdminLike(role);
  const isMaster = isMasterAdmin(role);
  const isStoreScopedAdmin = isStoreAdmin(role) || (!!role && !isMaster);

  useEffect(() => {
    if (!open || !isMaster) return;
    if (stores.length > 0 || loadingStores) return;

    setLoadingStores(true);
    fetch("/api/stores", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data?.data) ? data.data : [];
        setStores(list);
      })
      .catch(() => {
        setError("Failed to load stores. Please try again.");
      })
      .finally(() => setLoadingStores(false));
  }, [open, isMaster, stores.length, loadingStores]);

  useEffect(() => {
    if (isMaster) return; // master selects explicitly
    if (defaultStoreId) {
      // If defaultStoreId is provided (e.g., from store detail page), use it
      setStoreId(defaultStoreId);
    } else if (userStoreId) {
      setStoreId(userStoreId);
    }
  }, [isMaster, userStoreId, defaultStoreId]); // Add defaultStoreId to dependencies

  function resetForm() {
    setFile(null);
    setStoreId(isMaster ? "" : userStoreId || "");
    setError(null);
    setUploadResult(null);
  }

  function validate(): string | null {
    if (!canImport) return "You are not allowed to import data.";
    if (!file) return "Please select an Excel file.";
    
    if (isMaster && !storeId) {
      return "Please select a store.";
    }

    const validExtensions = [".xlsx", ".xls", ".ods"];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
    if (!validExtensions.includes(fileExtension)) {
      return "Invalid file type. Please upload an Excel file (.xlsx, .xls, or .ods).";
    }

    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file!);
      if (isMaster && storeId) {
        formData.append("storeId", storeId);
      } else if (defaultStoreId) {
        // For non-master admins on store detail page, use the defaultStoreId
        formData.append("storeId", defaultStoreId);
      }
      // Note: The API will use session storeId for non-master admins if storeId is not provided

      const endpoint = type === "assets" ? "/api/assets/bulk-import" : "/api/inventory/bulk-import";
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.success === false)) {
        const message =
          data?.error ||
          (res.status === 403
            ? "You are not authorized to import data."
            : "Failed to import data from Excel file.");
        setError(message);
        return;
      }

      if (data?.data) {
        setUploadResult(data.data);
      }

      // If all items were successful, close drawer and refresh
      if (data?.data?.failed === 0) {
        setTimeout(() => {
          resetForm();
          setOpen(false);
          if (onSuccess) {
            onSuccess();
          }
          startTransition(() => {
            router.refresh();
          });
        }, 2000);
      }
    } catch {
      setError("Unexpected error while importing data.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setUploadResult(null);
    }
  }

  if (!canImport) {
    return null;
  }

  const typeLabel = type === "assets" ? "Assets" : "Inventory Items";
  const exampleColumns =
    type === "assets"
      ? "Asset ID, Asset Name, Location, Status, Make, Model, Category, Parent Asset ID, Parent Asset Name, Tool Check-Out, Check-Out Requires Approval, Default WO Template"
      : "Name, Part Number, Quantity On Hand, Reorder Threshold, Location";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
      >
        <span className="mr-2 h-4 w-4" aria-hidden="true">
          ⬆
        </span>
        Import {typeLabel} from Excel
      </button>

      <Drawer open={open} onClose={() => setOpen(false)}>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 max-w-md mx-auto"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Import {typeLabel} from Excel
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Upload an Excel file to bulk import {typeLabel.toLowerCase()}. The file should contain columns: {exampleColumns}
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
              <span className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true">
                ⚠
              </span>
              <span>{error}</span>
            </div>
          )}

          {uploadResult && (
            <div
              className={`rounded-md px-3 py-2 text-xs ${
                uploadResult.failed === 0
                  ? "bg-green-50 text-green-700"
                  : "bg-yellow-50 text-yellow-700"
              }`}
            >
              <div className="flex items-start gap-2">
                {uploadResult.failed === 0 ? (
                  <span className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true">
                    ✔
                  </span>
                ) : (
                  <span className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true">
                    ⚠
                  </span>
                )}
                <div className="flex-1">
                  <p className="font-medium">
                    Import completed: {uploadResult.successful} successful, {uploadResult.failed} failed
                  </p>
                  {uploadResult.errors.length > 0 && (
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      {uploadResult.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {isMaster && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Store <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                required
              >
                <option value="">
                  {loadingStores ? "Loading stores..." : "Select a store…"}
                </option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code ? `${s.name} (${s.code})` : s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Excel File <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.oasis.opendocument.spreadsheet"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex items-center gap-2 rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <span className="h-4 w-4" aria-hidden="true">
                    ⬆
                  </span>
                  <span className="flex-1 truncate">
                    {file ? file.name : "Choose file..."}
                  </span>
                </div>
              </label>
              {file && (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setError(null);
                  }}
                  className="rounded p-1 text-gray-400 hover:text-gray-600"
                >
                  <span className="h-4 w-4" aria-hidden="true">
                    ✕
                  </span>
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Supported formats: .xlsx, .xls, .ods
            </p>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
              className="rounded-md border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-green-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
              disabled={loading || isPending || !file}
            >
              {loading ? "Importing..." : `Import ${typeLabel}`}
            </button>
          </div>
        </form>
      </Drawer>
    </>
  );
}


"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type StoreOption = { id: string; name: string; code?: string | null };

type Props = {
  stores: StoreOption[];
  isMaster: boolean;
  defaultStoreId?: string | null;
};

export default function ImportVendorsButton({
  stores,
  isMaster,
  defaultStoreId,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [storeId, setStoreId] = useState(defaultStoreId ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    total: number;
    errors: { row: number; email: string; message: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setResult(null);
    setError(null);
    setStoreId(defaultStoreId ?? "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select an Excel or XML file.");
      return;
    }
    if (isMaster && stores.length > 0 && !storeId) {
      setError("Please select a default store for vendors that don't have a store in the file.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (storeId) formData.append("storeId", storeId);

      const res = await fetch("/api/technicians/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Import failed.");
        setLoading(false);
        return;
      }

      setResult(data.data);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError((err as Error).message || "Import failed.");
    } finally {
      setLoading(false);
    }
  };

  const accept = ".xlsx,.xls,.xml";
  const formatHelp = (
    <div className="text-xs text-gray-500 mt-2 space-y-1">
      <p><strong>Excel:</strong> First row = headers. Required: Name, Email. Optional: Phone, Service on, Note, Store (or Store Code).</p>
      <p><strong>XML:</strong> &lt;vendors&gt;&lt;vendor&gt;&lt;name&gt;...&lt;/name&gt;&lt;email&gt;...&lt;/email&gt;...&lt;/vendor&gt;&lt;/vendors&gt;</p>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
      >
        Import vendors
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !loading && handleClose()}>
          <div
            className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Import vendor list</h2>
              <p className="text-sm text-gray-500 mb-4">
                Upload an Excel (.xlsx, .xls) or XML file. Each row becomes a vendor (no login account is created).
              </p>
              <a
                href="/api/technicians/import/template"
                download
                className="inline-block text-sm text-emerald-600 hover:text-emerald-700 font-medium mb-2"
              >
                Download Excel template
              </a>

              <form onSubmit={handleSubmit} className="space-y-4">
                {isMaster && stores.length > 0 && (
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">Default store (for rows without store)</span>
                    <select
                      value={storeId}
                      onChange={(e) => setStoreId(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">Select store...</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code ? `${s.name} (${s.code})` : s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">File</span>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setFile(f ?? null);
                      setError(null);
                    }}
                    className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-emerald-700"
                  />
                  {formatHelp}
                </label>

                {error && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {result && (
                  <div className="rounded-lg bg-gray-50 p-4 text-sm">
                    <p className="font-medium text-gray-900">
                      Import complete: {result.created} created, {result.skipped} skipped (of {result.total} rows).
                    </p>
                    {result.errors.length > 0 && (
                      <ul className="mt-2 list-disc list-inside text-gray-600 space-y-0.5">
                        {result.errors.slice(0, 10).map((e, i) => (
                          <li key={i}>Row {e.row} ({e.email}): {e.message}</li>
                        ))}
                        {result.errors.length > 10 && (
                          <li>… and {result.errors.length - 10} more</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    {result ? "Close" : "Cancel"}
                  </button>
                  {!result && (
                    <button
                      type="submit"
                      disabled={loading || !file}
                      className="px-4 py-2 text-sm font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {loading ? "Importing…" : "Import"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

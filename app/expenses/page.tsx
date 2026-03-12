"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { isAdminLike } from "@/lib/roles";

type Store = { id: string; name: string; code?: string | null };

type Expense = {
  id: string;
  description: string;
  amount: any;
  category: string | null;
  createdAt: string;
  store: { id: string; name: string } | null;
  part?: { id: string; name: string; partNumber: string | null } | null;
  createdBy?: { id: string; email: string | null } | null;
  workOrder?: { id: string; title: string | null } | null;
  invoiceUrl?: string | null;
  invoiceType?: string | null;
};

export default function ExpensesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();

  const role = (session?.user as any)?.role as string | undefined;
  const isAdmin = isAdminLike(role);
  const isSessionLoading = sessionStatus === "loading";

  // Redirect non-admins away
  useEffect(() => {
    if (!isSessionLoading && !isAdmin) {
      router.push("/");
    }
  }, [isSessionLoading, isAdmin, router]);

  if (!isAdmin && !isSessionLoading) {
    return null;
  }

  // Filters from URL
  const initialStoreId = searchParams.get("storeId") || "";
  const initialFrom = searchParams.get("from") || "";
  const initialTo = searchParams.get("to") || "";
  const initialCategory = searchParams.get("category") || "All";

  const [stores, setStores] = useState<Store[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [storeId, setStoreId] = useState(initialStoreId);
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [category, setCategory] = useState(initialCategory || "All");

  // New expense form state
  const [newStoreId, setNewStoreId] = useState(initialStoreId);
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("Parts");
  const [newInvoiceFile, setNewInvoiceFile] = useState<File | null>(null);
  const [newInvoicePreviewUrl, setNewInvoicePreviewUrl] = useState<
    string | null
  >(null);
  const [newInvoicePreviewType, setNewInvoicePreviewType] = useState<
    string | null
  >(null);
  const [newInvoiceSize, setNewInvoiceSize] = useState<string | null>(null);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savingExpense, setSavingExpense] = useState(false);

  // Load stores
  useEffect(() => {
    fetch("/api/stores", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : data.data || [];
        setStores(arr);
        if (!newStoreId && arr.length > 0) {
          setNewStoreId(arr[0].id);
        }
      })
      .catch(() => {
        setStores([]);
      });
  }, [newStoreId]);

  // Sync filters to URL
  const updateUrlFilters = (
    nextStoreId: string,
    nextFrom: string,
    nextTo: string,
    nextCategory: string
  ) => {
    const params = new URLSearchParams(
      searchParams ? searchParams.toString() : ""
    );
    if (nextStoreId) params.set("storeId", nextStoreId);
    else params.delete("storeId");

    if (nextFrom) params.set("from", nextFrom);
    else params.delete("from");

    if (nextTo) params.set("to", nextTo);
    else params.delete("to");

    if (nextCategory && nextCategory !== "All")
      params.set("category", nextCategory);
    else params.delete("category");

    params.delete("page");
    params.delete("limit");

    const qs = params.toString();
    router.replace(qs ? `/expenses?${qs}` : "/expenses");
  };

  // Load expenses when filters change
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (storeId) params.set("storeId", storeId);
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);
        if (category && category !== "All") params.set("category", category);
        params.set("page", "1");
        params.set("limit", "50");

        const res = await fetch(`/api/expenses?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || !data || data.success === false) {
          setExpenses([]);
          setTotal(0);
          setError(
            data?.error || "Failed to load expenses. Please try again later."
          );
          return;
        }

        const items: Expense[] = Array.isArray(data.data) ? data.data : [];
        setExpenses(items);
        setTotal(typeof data.total === "number" ? data.total : items.length);
        setPage(typeof data.page === "number" ? data.page : 1);
        setLimit(typeof data.limit === "number" ? data.limit : 50);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError("Failed to load expenses. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }

    load();

    return () => {
      controller.abort();
    };
  }, [storeId, fromDate, toDate, category, router, searchParams]);

  const totalAmount = useMemo(() => {
    return expenses.reduce((sum, exp) => {
      const n = Number(exp.amount ?? 0);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [expenses]);

  // New invoice file selection
  const handleNewInvoiceChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0] || null;
    setNewInvoiceFile(file);
    setFormError(null);

    if (!file) {
      if (newInvoicePreviewUrl) {
        URL.revokeObjectURL(newInvoicePreviewUrl);
      }
      setNewInvoicePreviewUrl(null);
      setNewInvoicePreviewType(null);
      setNewInvoiceSize(null);
      return;
    }

    const sizeKB = file.size / 1024;
    const sizeMB = sizeKB / 1024;
    const sizeLabel =
      sizeMB >= 1 ? `${sizeMB.toFixed(2)} MB` : `${sizeKB.toFixed(2)} KB`;
    setNewInvoiceSize(sizeLabel);

    if (newInvoicePreviewUrl) {
      URL.revokeObjectURL(newInvoicePreviewUrl);
    }

    if (file.type === "application/pdf") {
      setNewInvoicePreviewType("pdf");
      setNewInvoicePreviewUrl(file.name);
    } else if (
      file.type.startsWith("image/")
    ) {
      setNewInvoicePreviewType("image");
      setNewInvoicePreviewUrl(URL.createObjectURL(file));
    } else {
      setNewInvoicePreviewType("other");
      setNewInvoicePreviewUrl(file.name);
    }
  };

  async function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!newStoreId) {
      setFormError("Store is required.");
      return;
    }

    if (!newDescription.trim()) {
      setFormError("Description is required.");
      return;
    }

    const amountValue = parseFloat(newAmount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setFormError("Amount must be greater than 0.");
      return;
    }

    let invoiceUrl: string | null = null;
    let invoiceType: string | null = null;

    if (newInvoiceFile) {
      setUploadingInvoice(true);
      try {
        const fd = new FormData();
        fd.append("invoice", newInvoiceFile);

        const res = await fetch("/api/expenses/upload", {
          method: "POST",
          body: fd,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || !data.url) {
          setFormError(
            data?.error ||
              "Failed to upload invoice. Please try again."
          );
          setUploadingInvoice(false);
          return;
        }
        invoiceUrl = data.url;
        invoiceType = newInvoiceFile.type || null;
      } catch {
        setFormError(
          "Failed to upload invoice. Please check your connection and try again."
        );
        setUploadingInvoice(false);
        return;
      } finally {
        setUploadingInvoice(false);
      }
    }

    setSavingExpense(true);
    try {
      const userId = (session?.user as any)?.id as string | undefined;

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: newStoreId,
          description: newDescription.trim(),
          amount: amountValue,
          category: newCategory || null,
          invoiceUrl,
          invoiceType,
          createdById: userId,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.success === false) {
        setFormError(
          data?.error ||
            "Failed to create expense. Please try again."
        );
        return;
      }

      // Reset form
      setNewDescription("");
      setNewAmount("");
      setNewCategory("Parts");
      setNewInvoiceFile(null);
      if (newInvoicePreviewUrl) {
        URL.revokeObjectURL(newInvoicePreviewUrl);
      }
      setNewInvoicePreviewUrl(null);
      setNewInvoicePreviewType(null);
      setNewInvoiceSize(null);

      // Reload list
      const params = new URLSearchParams();
      if (storeId) params.set("storeId", storeId);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (category && category !== "All")
        params.set("category", category);
      params.set("page", "1");
      params.set("limit", "50");

      const refreshRes = await fetch(
        `/api/expenses?${params.toString()}`,
        { cache: "no-store" }
      );
      const refreshData = await refreshRes.json().catch(() => null);
      if (
        refreshRes.ok &&
        refreshData &&
        refreshData.success &&
        Array.isArray(refreshData.data)
      ) {
        setExpenses(refreshData.data);
        setTotal(
          typeof refreshData.total === "number"
            ? refreshData.total
            : refreshData.data.length
        );
      }
    } catch {
      setFormError("Unexpected error while creating expense.");
    } finally {
      setSavingExpense(false);
    }
  }

  const handleClearFilters = () => {
    setStoreId("");
    setFromDate("");
    setToDate("");
    setCategory("All");
    updateUrlFilters("", "", "", "All");
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      {/* Header + total */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Expenses
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track and manage expenses across stores and work orders.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase tracking-wide">
            Total (current view)
          </p>
          <p className="text-lg font-semibold text-slate-900">
            ${totalAmount.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Store
            </label>
            <select
              value={storeId}
              onChange={(e) => {
                const next = e.target.value;
                setStoreId(next);
                updateUrlFilters(next, fromDate, toDate, category);
              }}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All stores</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.code ? ` (${s.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setFromDate(next);
                  updateUrlFilters(storeId, next, toDate, category);
                }}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                To
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setToDate(next);
                  updateUrlFilters(storeId, fromDate, next, category);
                }}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => {
                const next = e.target.value;
                setCategory(next);
                updateUrlFilters(storeId, fromDate, toDate, next);
              }}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">All</option>
              <option value="Parts">Parts</option>
              <option value="Labor">Labor</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* New expense form */}
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          Add Expense
        </h2>
        {formError && (
          <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {formError}
          </div>
        )}
        <form
          onSubmit={handleCreateExpense}
          className="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end"
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Store
            </label>
            <select
              value={newStoreId}
              onChange={(e) => setNewStoreId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Select store…</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.code ? ` (${s.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Description
            </label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="e.g. Replacement fan motor"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Amount
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full rounded-md border border-slate-300 pl-5 pr-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Parts">Parts</option>
                  <option value="Labor">Labor</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer text-xs font-medium text-indigo-600 hover:text-indigo-700">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,application/pdf,image/jpeg,image/png,image/webp"
                  onChange={handleNewInvoiceChange}
                  className="hidden"
                />
                {uploadingInvoice
                  ? "Uploading invoice..."
                  : "Attach invoice"}
              </label>
              {newInvoicePreviewType === "image" && newInvoicePreviewUrl && (
                <div className="flex items-center gap-2">
                  <img
                    src={newInvoicePreviewUrl}
                    alt="Invoice preview"
                    className="h-8 w-8 rounded object-cover border border-slate-200"
                  />
                  {newInvoiceSize && (
                    <span className="text-[11px] text-slate-500">
                      {newInvoiceSize}
                    </span>
                  )}
                </div>
              )}
              {newInvoicePreviewType === "pdf" && newInvoicePreviewUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden="true">
                    📄
                  </span>
                  <span className="text-[11px] text-slate-600 truncate max-w-[120px]">
                    {newInvoicePreviewUrl}
                  </span>
                  {newInvoiceSize && (
                    <span className="text-[11px] text-slate-500">
                      {newInvoiceSize}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={savingExpense || uploadingInvoice}
              className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              {savingExpense ? "Saving…" : "Add Expense"}
            </button>
          </div>
        </form>
      </div>

      {/* Expenses table */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {error && (
          <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        {loading ? (
          <p className="text-xs text-slate-400">Loading expenses…</p>
        ) : expenses.length === 0 ? (
          <p className="text-xs text-slate-400">
            No expenses found for the selected filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Store</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">Part</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-left">Work Order</th>
                  <th className="px-4 py-2 text-left">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => {
                  const createdAt = new Date(exp.createdAt);
                  const isPdf =
                    exp.invoiceType === "application/pdf" ||
                    (exp.invoiceUrl || "").toLowerCase().endsWith(".pdf");
                  const isImage =
                    exp.invoiceType?.startsWith("image/") ||
                    /\.(jpg|jpeg|png|webp)$/i.test(exp.invoiceUrl || "");

                  return (
                    <tr
                      key={exp.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-2 align-top text-slate-600">
                        {createdAt.toLocaleDateString()}{" "}
                        <span className="text-[10px] text-slate-400">
                          {createdAt.toLocaleTimeString()}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-top text-slate-800">
                        {exp.store?.name || "—"}
                      </td>
                      <td className="px-4 py-2 align-top text-slate-800">
                        {exp.description}
                      </td>
                      <td className="px-4 py-2 align-top text-slate-700">
                        {exp.category || "—"}
                      </td>
                      <td className="px-4 py-2 align-top text-slate-700">
                        {exp.part
                          ? `${exp.part.name}${
                              exp.part.partNumber
                                ? ` (${exp.part.partNumber})`
                                : ""
                            }`
                          : "—"}
                      </td>
                      <td className="px-4 py-2 align-top text-right text-slate-900 font-semibold">
                        ${Number(exp.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 align-top text-slate-700">
                        {exp.workOrder ? (
                          <span>
                            {exp.workOrder.title || exp.workOrder.id}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-2 align-top text-slate-700">
                        {exp.invoiceUrl ? (
                          isImage ? (
                            <a
                              href={exp.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block"
                            >
                              <img
                                src={exp.invoiceUrl}
                                alt="Invoice"
                                className="h-8 w-8 rounded object-cover border border-slate-200"
                              />
                            </a>
                          ) : isPdf ? (
                            <a
                              href={exp.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-indigo-600 underline"
                            >
                              <span aria-hidden="true">📄</span>
                              <span>View PDF</span>
                            </a>
                          ) : (
                            <a
                              href={exp.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-600 underline"
                            >
                              View
                            </a>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            No invoice
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


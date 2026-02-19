"use client";

import { useRouter, usePathname } from "next/navigation";

type Props = {
  sortField: string;
  sortOrder: string;
  searchQuery?: string;
  selectedStoreId?: string | null;
};

export default function RequestsSortControls({
  sortField,
  sortOrder,
  searchQuery,
  selectedStoreId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function buildParams(updates: { sortBy?: string; sortOrder?: string }) {
    const params = new URLSearchParams();
    if (selectedStoreId != null && selectedStoreId !== "") {
      params.set("storeId", selectedStoreId);
    }
    if (searchQuery != null && searchQuery !== "") {
      params.set("q", searchQuery);
    }
    params.set("sortBy", updates.sortBy ?? sortField);
    params.set("sortOrder", updates.sortOrder ?? sortOrder);
    return params.toString();
  }

  function handleSortByChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const qs = buildParams({ sortBy: e.target.value });
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  function handleSortOrderChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const qs = buildParams({ sortOrder: e.target.value });
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-gray-500">Sort:</span>
      <select
        name="sortBy"
        value={sortField}
        onChange={handleSortByChange}
        className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2b8cee]/50"
      >
        <option value="createdAt">Date</option>
        <option value="requestNumber">Request ID</option>
        <option value="title">Title</option>
        <option value="status">Status</option>
        <option value="priority">Priority</option>
        <option value="createdBy">Requester</option>
      </select>
      <select
        name="sortOrder"
        value={sortOrder}
        onChange={handleSortOrderChange}
        className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2b8cee]/50"
      >
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
      </select>
    </div>
  );
}

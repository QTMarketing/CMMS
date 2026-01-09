"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type DashboardHeaderProps = {
  email: string;
  pendingCount: number;
  overdueCount: number;
  scheduledMaintenanceCount: number;
  searchItems: DashboardSearchItem[];
};

export type DashboardSearchItem = {
  id: string;
  type: "workorder" | "asset" | "inventory" | "maintenance" | "upcoming";
  title: string;
  description?: string;
  href: string;
};

export default function DashboardHeader({
  email,
  pendingCount,
  overdueCount,
  scheduledMaintenanceCount,
  searchItems,
}: DashboardHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [query, setQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-md">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M5 11a6 6 0 1112 0 6 6 0 01-12 0z"
            />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search work orders, assets, inventory, maintenance…"
          className="w-full rounded border border-transparent bg-slate-100 px-10 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            setShowSearchResults(!!value.trim());
          }}
          onFocus={() => {
            if (query.trim()) setShowSearchResults(true);
          }}
          onBlur={() => {
            // let click events on results fire before closing
            setTimeout(() => setShowSearchResults(false), 120);
          }}
        />

        {showSearchResults && (
          <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-md border border-slate-200 bg-white text-xs shadow-lg">
            {query.trim() ? (
              <SearchResults query={query} items={searchItems} />
            ) : (
              <div className="px-3 py-2 text-[11px] text-slate-400">
                Type to search work orders, assets, inventory, and maintenance.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 md:justify-end">
        {/* Notification bell with dropdown */}
        <div className="relative">
          <button
            type="button"
            className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Notifications"
            onClick={() => {
              setShowNotifications((prev) => !prev);
            }}
          >
            <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.4-1.4A2 2 0 0118 14.172V11a6 6 0 10-12 0v3.172a2 2 0 01-.586 1.414L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </button>
          {showNotifications && (
            <div className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-slate-200 bg-white p-3 text-xs shadow-lg">
              <p className="mb-1 text-[11px] font-semibold uppercase text-slate-400">
                Notifications
              </p>
              <ul className="space-y-2">
                <li className="flex items-center justify-between">
                  <span className="text-slate-600">Pending work orders</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    {pendingCount}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-600">Overdue work orders</span>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                    {overdueCount}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-600">
                    Active PM schedules
                  </span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    {scheduledMaintenanceCount}
                  </span>
                </li>
              </ul>
              <div className="mt-2 border-t pt-2 text-right">
                <Link
                  href="/schedules"
                  className="text-[11px] font-medium text-orange-600 hover:underline"
                >
                  View maintenance
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}

type SearchResultsProps = {
  query: string;
  items: DashboardSearchItem[];
};

function SearchResults({ query, items }: SearchResultsProps) {
  const normalized = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalized) return [];
    const match = (value?: string | null) =>
      value?.toLowerCase().includes(normalized);

    return items
      .filter((item) => match(item.title) || match(item.description))
      .slice(0, 10);
  }, [items, normalized]);

  if (!normalized || filtered.length === 0) {
    return (
      <div className="px-3 py-2 text-[11px] text-slate-400">
        No matches found for “{query.trim()}”.
      </div>
    );
  }

  const typeLabel = (type: DashboardSearchItem["type"]) => {
    switch (type) {
      case "workorder":
        return "Work Order";
      case "asset":
        return "Asset";
      case "inventory":
        return "Inventory";
      case "maintenance":
        return "Maintenance";
      case "upcoming":
        return "Upcoming Maintenance";
      default:
        return "Result";
    }
  };

  return (
    <ul className="max-h-72 overflow-y-auto py-1">
      {filtered.map((item) => (
        <li key={`${item.type}-${item.id}`}>
          <Link
            href={item.href}
            className="flex flex-col gap-0.5 px-3 py-2 text-xs hover:bg-slate-50"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-slate-800">{item.title}</span>
              <span className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {typeLabel(item.type)}
              </span>
            </div>
            {item.description && (
              <span className="truncate text-[11px] text-slate-500">
                {item.description}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}




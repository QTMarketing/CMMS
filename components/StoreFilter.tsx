"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type StoreOption = {
  id: string;
  name: string;
  code?: string | null;
};

type Props = {
  stores: StoreOption[];
  selectedStoreId?: string | null;
  label?: string;
};

export default function StoreFilter({
  stores,
  selectedStoreId,
  label = "Store",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentValue =
    selectedStoreId ?? searchParams.get("storeId") ?? "";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams.toString());

    if (!value) {
      params.delete("storeId");
    } else {
      params.set("storeId", value);
    }

    const queryString = params.toString();
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;

    router.replace(nextUrl, { scroll: false });
  }

  if (!stores || stores.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-medium text-gray-600">{label}:</span>
      <select
        className="border rounded px-2 py-1 text-xs sm:text-sm"
        value={currentValue}
        onChange={handleChange}
      >
        <option value="">All stores</option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.code ? `${s.name} (${s.code})` : s.name}
          </option>
        ))}
      </select>
    </div>
  );
}



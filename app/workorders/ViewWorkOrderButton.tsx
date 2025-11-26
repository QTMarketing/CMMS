"use client";

import Link from "next/link";

export default function ViewWorkOrderButton({ id }: { id: string }) {
  return (
    <Link
      href={`/workorders/${id}`}
      className="border border-slate-300 text-slate-700 px-3 py-1 rounded-md text-xs font-medium hover:bg-slate-50"
    >
      View
    </Link>
  );
}

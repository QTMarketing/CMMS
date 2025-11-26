"use client";
import Link from "next/link";
export default function EditWorkOrderButton({ id }: { id: string }) {
  return (
    <Link
      href={`/workorders/${id}/edit`}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
      Edit
    </Link>
  );
}

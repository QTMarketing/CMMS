"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface WorkOrderPageActionsProps {
  workOrderId: string;
}

export default function WorkOrderPageActions({ workOrderId }: WorkOrderPageActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this work order? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/workorders/${workOrderId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/workorders");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Failed to delete work order.");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/workorders/${workOrderId}/edit`}
        className="inline-flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
      >
        <span className="text-sm leading-none">✎</span>
        <span>Edit Work Order</span>
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
      >
        <span className="text-sm leading-none" aria-hidden>🗑</span>
        <span>{deleting ? "Deleting..." : "Delete"}</span>
      </button>
    </div>
  );
}

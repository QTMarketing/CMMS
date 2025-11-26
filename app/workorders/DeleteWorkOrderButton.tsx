"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function DeleteWorkOrderButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = async () => {
    if (!confirm("Delete this work order?")) return;

    await fetch(`/api/workorders/${id}`, { method: "DELETE" });

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="text-slate-400 hover:text-red-500 disabled:opacity-60"
      aria-label="Delete work order"
    >
      🗑
    </button>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  onDeleted?: () => void;
}

export default function DeleteWorkOrderButton({ id, onDeleted }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = async () => {
    if (!confirm("Delete this work order?")) return;

    const res = await fetch(`/api/workorders/${id}`, { method: "DELETE" });

    if (!res.ok) {
      // Surface error in console but avoid breaking the UI flow.
      console.error("Failed to delete work order", await res.json().catch(() => null));
      return;
    }

    if (onDeleted) {
      onDeleted();
    } else {
      startTransition(() => {
        router.refresh();
      });
    }
  };

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        handleDelete();
      }}
      disabled={isPending}
      className="text-slate-400 hover:text-red-500 disabled:opacity-60"
      aria-label="Delete work order"
    >
      🗑
    </button>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  active: boolean;
};

export default function ToggleTechnicianActive({ id, active }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleToggle() {
    try {
      const res = await fetch(`/api/technicians/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });

      if (!res.ok) {
        // Optional: you can surface an error toast here later.
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      // swallow for now; future enhancement could show a toast
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={
        active
          ? "inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-60"
          : "inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-200 disabled:opacity-60"
      }
    >
      {active ? "Set Inactive" : "Set Active"}
    </button>
  );
}



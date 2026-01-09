"use client";

import { useRouter } from "next/navigation";

interface ClickableStatusDonutProps {
  pending: number;
  overdue: number;
  completed: number;
  inProgress: number;
  total: number;
}

export default function ClickableStatusDonut({
  pending,
  overdue,
  completed,
  inProgress,
  total,
}: ClickableStatusDonutProps) {
  const router = useRouter();

  const handleStatusClick = (filter: string) => {
    // Map filters to dedicated page routes
    const routeMap: Record<string, string> = {
      open: "/workorders/pending",
      overdue: "/workorders/overdue",
      completed: "/workorders/completed",
      inProgress: "/workorders/in-progress",
    };
    
    const route = routeMap[filter] || `/workorders?filter=${filter}`;
    router.push(route);
  };

  // Calculate percentages for each segment
  const segments = [
    { key: "pending", label: "Pending", value: pending, color: "#F59E0B", filter: "open" },
    { key: "overdue", label: "Overdue", value: overdue, color: "#EF4444", filter: "overdue" },
    { key: "completed", label: "Completed", value: completed, color: "#10B981", filter: "completed" },
    { key: "inProgress", label: "In Progress", value: inProgress, color: "#3B82F6", filter: "inProgress" },
  ];

  let donutGradient = "conic-gradient(#e5e7eb 0% 100%)"; // gray fallback

  if (total > 0) {
    let current = 0;
    const parts: string[] = [];

    for (const seg of segments) {
      const start = current;
      const end = current + (seg.value / total) * 100;
      parts.push(`${seg.color} ${start}% ${end}%`);
      current = end;
    }

    donutGradient = `conic-gradient(${parts.join(", ")})`;
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center">
      <div className="relative flex-shrink-0 mx-auto md:mx-0">
        <div
          className="relative h-36 w-36 rounded-full cursor-pointer transition-transform hover:scale-105"
          style={{ backgroundImage: donutGradient }}
          onClick={() => {
            // If clicking the center, show all work orders
            router.push("/workorders");
          }}
        >
          <div className="absolute inset-4 rounded-full bg-white" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-slate-900">{total}</span>
            <span className="text-sm text-slate-500">in total</span>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-3 text-sm">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className="flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded px-2 py-1 transition-colors group"
            onClick={() => handleStatusClick(seg.filter)}
            title={`Click to view ${seg.label.toLowerCase()} work orders`}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full transition-transform group-hover:scale-125"
                style={{ backgroundColor: seg.color }}
              />
              <span className="group-hover:text-indigo-600 transition-colors">{seg.label}</span>
            </div>
            <span className="font-medium group-hover:text-indigo-600 transition-colors">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


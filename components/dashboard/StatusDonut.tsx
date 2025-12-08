"use client";

type StatusDonutProps = {
  total: number;
  pending: number;
  overdue: number;
  completed: number;
  inProgress: number;
};

type SegmentKey = "pending" | "overdue" | "completed" | "inProgress";

const SEGMENT_META: Record<
  SegmentKey,
  { label: string; color: string }
> = {
  pending: { label: "Pending", color: "#F59E0B" },
  overdue: { label: "Overdue", color: "#EF4444" },
  completed: { label: "Completed", color: "#10B981" },
  inProgress: { label: "In Progress", color: "#3B82F6" },
};

export default function StatusDonut({
  total,
  pending,
  overdue,
  completed,
  inProgress,
}: StatusDonutProps) {
  const safeTotal = total > 0 ? total : 1;

  const segments: { key: SegmentKey; value: number }[] = [
    { key: "pending", value: pending },
    { key: "overdue", value: overdue },
    { key: "completed", value: completed },
    { key: "inProgress", value: inProgress },
  ];

  let offset = 25; // start at top (90deg)

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        viewBox="0 0 100 100"
        className="h-36 w-36"
        aria-label="Work order status distribution"
      >
        {/* Background ring */}
        <circle
          cx="50"
          cy="50"
          r="32"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="10"
        />

        {segments.map(({ key, value }) => {
          if (value <= 0) return null;
          const length = (value / safeTotal) * 100;
          const strokeDasharray = `${length} ${100 - length}`;
          const strokeDashoffset = 100 - offset;
          const meta = SEGMENT_META[key];

          offset += length;

          return (
            <circle
              key={key}
              cx="50"
              cy="50"
              r="32"
              fill="none"
              stroke={meta.color}
              strokeWidth={10}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="butt"
              className="transition-[stroke-width] duration-150 ease-out"
            />
          );
        })}

        {/* Inner cutout to create donut */}
        <circle
          cx="50"
          cy="50"
          r="24"
          fill="#FFFFFF"
          className="text-white"
        />
      </svg>
    </div>
  );
}



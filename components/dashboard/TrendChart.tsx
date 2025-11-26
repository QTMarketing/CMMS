import React from "react";

// Expects data: [{ date: string, createdCount: number, completedCount: number }[]]
export default function TrendChart({
  data,
}: {
  data: { date: string; createdCount: number; completedCount: number }[];
}) {
  // Chart size
  const width = 400;
  const height = 160;
  const padding = 32;

  // Max Y axis for both lines
  const maxCount = Math.max(
    ...data.map((d) => Math.max(d.createdCount, d.completedCount)),
    5
  );
  const yScale = (count: number) =>
    height - padding - (count / maxCount) * (height - 2 * padding);

  // X step
  const xStep = (width - 2 * padding) / (data.length - 1);

  const orange = "#F97316";
  const orangeArea = "rgba(251, 146, 60, 0.10)";
  const green = "#10B981";
  const greenArea = "rgba(16,185,129,0.12)";

  // Polyline points for Created & Completed
  const createdPoints = data
    .map((d, i) => `${padding + i * xStep},${yScale(d.createdCount)}`)
    .join(" ");
  const completedPoints = data
    .map((d, i) => `${padding + i * xStep},${yScale(d.completedCount)}`)
    .join(" ");
  // Area fills
  const createdArea = `${createdPoints} ${padding + (data.length - 1) * xStep},${height - padding} ${padding},${height - padding}`;
  const completedArea = `${completedPoints} ${padding + (data.length - 1) * xStep},${height - padding} ${padding},${height - padding}`;

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow w-fit overflow-x-auto">
      <div className="flex items-center gap-4 mb-2 text-sm font-semibold text-gray-600">
        <span>
          <span className="inline-block w-3 h-3 rounded bg-orange-500 mr-1 align-middle" />
          Created
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded bg-emerald-500 mr-1 align-middle" />
          Completed
        </span>
        <span className="ml-auto text-xs text-gray-400">Past {data.length} days</span>
      </div>
      <div className="overflow-x-auto" style={{ maxWidth: "100vw" }}>
        <svg width={width} height={height} className="block">
          <rect x={0} y={0} width={width} height={height} fill="#fff" />
          {/* Area fills under the lines */}
          <polygon points={completedArea} fill={greenArea} />
          <polygon points={createdArea} fill={orangeArea} />
          {/* Y axis (dashed lines + labels) */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const y = padding + (height - 2 * padding) * t;
            const value = Math.round(maxCount * (1 - t));
            return (
              <g key={i}>
                <line
                  x1={padding}
                  x2={width - padding}
                  y1={y}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray="2,2"
                />
                <text
                  x={padding - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={10}
                  fill="#888"
                >
                  {value}
                </text>
              </g>
            );
          })}
          {/* Lines */}
          <polyline
            fill="none"
            stroke={orange}
            strokeWidth={2}
            points={createdPoints}
          />
          <polyline
            fill="none"
            stroke={green}
            strokeWidth={2}
            points={completedPoints}
          />
          {/* Points/circles for both lines */}
          {data.map((d, i) => (
            <circle
              key={`c-create-${i}`}
              cx={padding + i * xStep}
              cy={yScale(d.createdCount)}
              r={4}
              fill={orange}
            />
          ))}
          {data.map((d, i) => (
            <circle
              key={`c-complete-${i}`}
              cx={padding + i * xStep}
              cy={yScale(d.completedCount)}
              r={4}
              fill={green}
            />
          ))}
          {/* Date labels */}
          {data.map((d, i) => (
            <text
              key={i}
              x={padding + i * xStep}
              y={height - padding + 16}
              textAnchor="middle"
              fontSize={10}
              fill="#555"
            >
              {d.date.slice(5)}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

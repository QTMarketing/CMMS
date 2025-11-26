"use client";
import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export type TrendPoint = {
  date: string;       // e.g. 2025-01-11
  label: string;      // e.g. Nov 11
  createdCount: number;
  completedCount: number;
};

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length > 0) {
    const d: TrendPoint = payload[0].payload;
    return (
      <div className="bg-white rounded shadow p-3 text-xs min-w-[90px]">
        <div className="mb-1 font-medium">{d.label}</div>
        <div className="text-emerald-600">Completed : {d.completedCount}</div>
        <div className="text-orange-600 mt-1">Created : {d.createdCount}</div>
      </div>
    );
  }
  return null;
}

export default function WorkOrderTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 w-full">
      <div className="w-full overflow-x-auto">
        <div className="min-w-[800px]">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 14 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                interval={0}
                tickFormatter={l => l}
                tick={typeof window !== 'undefined' && window.innerWidth < 768 ? { fontSize: 10 } : { fontSize: 12 }}
                angle={typeof window !== 'undefined' && window.innerWidth < 768 ? -30 : 0}
                textAnchor={typeof window !== 'undefined' && window.innerWidth < 768 ? "end" : "middle"}
              />
              <YAxis allowDecimals={false} domain={[0, dataMax => Math.max(dataMax, 5)]} fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="createdCount" name="Created" fill="#F97316" radius={[4,4,0,0]} barSize={22} />
              <Bar dataKey="completedCount" name="Completed" fill="#16A34A" radius={[4,4,0,0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function WorkOrderTrendChartLive() {
  // Fetch workOrders from /api/workorders
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  useEffect(() => {
    fetch("/api/workorders")
      .then(res => res.json())
      .then(data => {
        if (!data.success || !Array.isArray(data.data)) return;
        const workOrders = data.data;
        // Dates: last 14d
        const daysMeta = (() => {
          const out: {date: string, label: string}[] = [];
          const now = new Date();
          now.setUTCHours(0,0,0,0);
          for (let i = 13; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const iso = d.toISOString().slice(0,10);
            const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
            out.push({ date: iso, label });
          }
          return out;
        })();
        // Map & aggregate
        const trendMap: Record<string, TrendPoint> = Object.fromEntries(
          daysMeta.map(({ date, label }) => [date, { date, label, createdCount: 0, completedCount: 0 }])
        );
        for (const wo of workOrders) {
          const createdDate = (() => { const d = new Date(wo.createdAt); d.setUTCHours(0,0,0,0); return d.toISOString().slice(0,10); })();
          if (trendMap[createdDate]) trendMap[createdDate].createdCount += 1;
          if (wo.status === "Completed" && wo.completedAt) {
            const compDate = (() => { const d = new Date(wo.completedAt); d.setUTCHours(0,0,0,0); return d.toISOString().slice(0,10); })();
            if (trendMap[compDate]) trendMap[compDate].completedCount += 1;
          }
        }
        setTrendData(Object.values(trendMap).sort((a,b)=>a.date.localeCompare(b.date)));
      });
  }, []);

  return <WorkOrderTrendChart data={trendData} />;
}

import React from "react";

export default function KpiCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl w-full p-4 sm:p-6 shadow-sm flex flex-col items-start mb-2 sm:mb-0">
      <div className="flex items-center gap-2">
        {icon && <span className="text-orange-500">{icon}</span>}
        <div className="text-sm text-gray-600">{title}</div>
      </div>
      <div className="text-3xl font-bold mt-2 text-orange-600">{value}</div>
    </div>
  );
}

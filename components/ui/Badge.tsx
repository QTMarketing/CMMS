import { ReactNode } from "react";

export default function Badge({
  colorClass,
  children,
}: {
  colorClass: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-block px-2 py-1 rounded text-xs font-medium ${colorClass}`}
    >
      {children}
    </span>
  );
}

//
// Use these in usage sites now:
//   Priority:
//     High:    bg-orange-100 text-orange-700
//     Medium:  bg-yellow-100 text-yellow-700
//     Low:     bg-green-100 text-green-700
//   Status:
//     Open:         bg-orange-50 text-orange-700
//     In Progress:  bg-blue-50 text-blue-700
//     Completed:    bg-green-50 text-green-700
//     Cancelled:    bg-gray-100 text-gray-600
//

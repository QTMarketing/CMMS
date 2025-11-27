import { ReactNode } from "react";

export default function Table({
  headers,
  children,
  textSizeClass = "text-xs sm:text-sm",
}: {
  headers: string[];
  children: ReactNode;
  textSizeClass?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm w-full overflow-x-auto px-2 sm:px-0">
      <table className={`min-w-[600px] sm:min-w-full min-w-0 w-full ${textSizeClass}`}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className={`text-left px-4 py-2 font-semibold text-gray-700 dark:text-gray-200 ${textSizeClass}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Badge from "../../components/ui/Badge";
import { isAdminLike } from "@/lib/roles";
import { getScopedStoreId, canSeeAllStores } from "@/lib/storeAccess";

export const dynamic = "force-dynamic";

function getPmStatus(nextDueDate: Date | null | undefined) {
  if (!nextDueDate) {
    return {
      label: "Unknown",
      color: "bg-gray-100 text-gray-700",
    };
  }

  const now = new Date();
  const diffMs = nextDueDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) {
    return {
      label: "Overdue",
      color: "bg-red-100 text-red-700",
    };
  }

  if (diffDays <= 7) {
    return {
      label: "Due Soon",
      color: "bg-amber-100 text-amber-700",
    };
  }

  return {
    label: "On Track",
    color: "bg-emerald-100 text-emerald-700",
  };
}

export default async function PmSchedulesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  // If there is no session at all, send the user to login instead of
  // treating them as a non-admin.
  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role;
  const isAdmin = isAdminLike(role);
  const isTechnician = role === "TECHNICIAN";

  // Allow technicians to access PM schedules page
  // Only redirect non-admin, non-technician users
  if (!isAdmin && !isTechnician) {
    redirect("/");
  }

  const userStoreId = ((session.user as any)?.storeId ?? null) as
    | string
    | null;

  const where: any = {};

  if (!canSeeAllStores(role)) {
    const scopedStoreId = getScopedStoreId(role, userStoreId);
    if (scopedStoreId) {
      where.storeId = scopedStoreId;
    } else {
      where.storeId = "__never_match__";
    }
  }

  const searchQuery =
    typeof params.q === "string" && params.q.trim().length > 0
      ? params.q.trim()
      : "";

  if (searchQuery) {
    // Allow searching by PM id, title, or related asset name.
    where.OR = [
      { id: { contains: searchQuery, mode: "insensitive" } },
      { title: { contains: searchQuery, mode: "insensitive" } },
      {
        asset: {
          name: { contains: searchQuery, mode: "insensitive" },
        },
      },
    ];
  }

  // Use existing Prisma model: PreventiveSchedule
  const pmSchedules = await prisma.preventiveSchedule.findMany({
    where,
    include: {
      asset: true,
    },
    orderBy: {
      nextDueDate: "asc",
    },
  });

  const today = new Date();

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Preventive Maintenance Schedules
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Plan, track, and manage all your preventive maintenance tasks.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/pm/new"
            className="flex items-center justify-center gap-2 px-4 py-2 mt-2 sm:mt-0 text-sm font-medium text-white bg-emerald-500 border border-transparent rounded shadow-sm hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <span className="text-base">＋</span>
            <span>Create New Schedule</span>
          </Link>
        )}
      </header>

      {/* Card: search + table */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          {/* Search */}
          <form
            className="relative w-full md:max-w-md"
            action="/pm"
            method="get"
          >
            <input
              name="q"
              defaultValue={searchQuery}
              className="w-full bg-gray-50 border border-gray-300 rounded pl-10 pr-4 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Search by asset, schedule ID, or title..."
              type="text"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              🔍
            </span>
          </form>

          {/* Filter / sort placeholders (non-functional for now) */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
            >
              <span className="text-base">⏱</span>
              <span>Filter</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
            >
              <span className="text-base">↕</span>
              <span>Sort By</span>
            </button>
          </div>
        </div>

        {pmSchedules.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 bg-white">
            No preventive maintenance schedules found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schedule ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pmSchedules.map((pm) => {
                  const status = getPmStatus(pm.nextDueDate);

                  let statusColorClasses = "bg-gray-100 text-gray-800";
                  if (status.label === "On Track") {
                    statusColorClasses = "bg-green-100 text-green-800";
                  } else if (status.label === "Due Soon") {
                    statusColorClasses = "bg-yellow-100 text-yellow-800";
                  } else if (status.label === "Overdue") {
                    statusColorClasses = "bg-red-100 text-red-800";
                  }

                  return (
                    <tr key={pm.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {pm.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <Link
                          href={`/pm/${pm.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {(pm as any).asset?.name ?? pm.assetId}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Every {pm.frequencyDays} days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {pm.nextDueDate
                          ? new Date(pm.nextDueDate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {/* No assigned technician field yet; placeholder */}
                        —
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColorClasses}`}
                        >
                          <span className="mr-1.5 h-2 w-2 rounded-full bg-current opacity-70" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/pm/${pm.id}/edit`}
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Status is calculated relative to today ({today.toLocaleDateString()})
        and is for display only.
      </p>
    </div>
  );
}



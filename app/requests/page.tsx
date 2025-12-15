import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Table from "@/components/ui/Table";
import Link from "next/link";
import { isAdminLike, isMasterAdmin } from "@/lib/roles";
import { getScopedStoreId, canSeeAllStores } from "@/lib/storeAccess";
import StoreFilter from "@/components/StoreFilter";
import {
  approveRequest,
  rejectRequest,
  convertRequestToWorkOrder,
} from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role;
  const isAdmin = isAdminLike(role);
  const isUser = role === "USER";

  // Allow admins and users to access requests page
  if (!isAdmin && !isUser) {
    redirect("/workorders");
  }

  const userStoreId = ((session.user as any)?.storeId ?? null) as
    | string
    | null;

  const where: any = {};
  const params = await searchParams;
  const selectedStoreId =
    typeof params.storeId === "string" && params.storeId.length > 0
      ? params.storeId
      : undefined;

  const searchQuery =
    typeof params.q === "string" && params.q.trim().length > 0
      ? params.q.trim()
      : "";

  if (isMasterAdmin(role)) {
    if (selectedStoreId) {
      where.storeId = selectedStoreId;
    }
  } else if (!canSeeAllStores(role)) {
    const scopedStoreId = getScopedStoreId(role, userStoreId);
    if (scopedStoreId) {
      where.storeId = scopedStoreId;
    } else {
      where.storeId = "__never_match__";
    }
  }

  if (searchQuery) {
    where.OR = [
      { id: { contains: searchQuery, mode: "insensitive" } },
      { title: { contains: searchQuery, mode: "insensitive" } },
      {
        asset: {
          name: { contains: searchQuery, mode: "insensitive" },
        },
      },
      { createdBy: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  let requests: any[] = [];
  let stores: { id: string; name: string; code?: string | null }[] = [];

  try {
    const [reqs, storeResults] = await Promise.all([
      prisma.request.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { asset: true },
      }),
      isMasterAdmin(role)
        ? prisma.store.findMany({
            select: { id: true, name: true, code: true },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
    ]);

    requests = reqs;
    stores = storeResults as any;
  } catch (err) {
    console.error("Error loading requests page data:", err);
    // Fail soft: render the page with no requests / stores instead of 500.
    requests = [];
    stores = [];
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Maintenance Requests
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Approve, reject, or convert maintenance requests into work orders.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isMasterAdmin(role) && stores.length > 0 && (
            <StoreFilter
              stores={stores as any}
              selectedStoreId={selectedStoreId ?? null}
              label="Store"
            />
          )}
          <button
            type="button"
            className="flex items-center justify-center gap-2 min-w-[84px] rounded-lg h-10 px-4 bg-[#2b8cee] text-white text-sm font-bold tracking-[0.015em] hover:bg-[#1e71c5]"
          >
            <span className="text-base">+</span>
            <span className="truncate">Add New Request</span>
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200">
        {/* Search + filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <form
            className="flex-grow"
            action="/requests"
            method="get"
          >
            <label className="flex flex-col min-w-40 h-12 w-full">
              <div className="flex w-full flex-1 items-stretch rounded-lg h-full border border-gray-200 bg-gray-100">
                <div className="flex items-center justify-center pl-4 pr-2 text-gray-500">
                  <span className="text-base">🔍</span>
                </div>
                <input
                  name="q"
                  defaultValue={searchQuery}
                  className="flex w-full min-w-0 flex-1 rounded-r-lg border-0 bg-gray-100 h-full px-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2b8cee]/50"
                  placeholder="Search by request ID, title, asset..."
                />
              </div>
            </label>
          </form>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-gray-100 border border-gray-200 px-4 hover:bg-gray-200 text-sm text-gray-800">
              <span>Status: All</span>
              <span className="text-lg">▾</span>
            </button>
            <button className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-gray-100 border border-gray-200 px-4 hover:bg-gray-200 text-sm text-gray-800">
              <span>Priority: All</span>
              <span className="text-lg">▾</span>
            </button>
            <button className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-gray-100 border border-gray-200 px-4 hover:bg-gray-200 text-sm text-gray-800">
              <span>Asset: All</span>
              <span className="text-lg">▾</span>
            </button>
            <button className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-gray-100 border border-gray-200 px-4 hover:bg-gray-200 text-sm text-gray-800">
              <span>Requester: All</span>
              <span className="text-lg">▾</span>
            </button>
            <button className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-gray-100 border border-gray-200 px-4 hover:bg-gray-200 text-sm text-gray-800">
              <span>Due Date</span>
              <span className="text-lg">▾</span>
            </button>
          </div>
        </div>

        {/* Table */}
        {requests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 bg-white">
            No maintenance requests have been submitted yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requester
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.map((req) => {
                  // Map status to badge styles roughly matching the mock
                  const status = req.status || "Open";
                  let statusClasses =
                    "inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800";
                  if (status === "Open" || status === "New") {
                    statusClasses =
                      "inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800";
                  } else if (status === "In Progress") {
                    statusClasses =
                      "inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800";
                  } else if (status === "Closed" || status === "Completed") {
                    statusClasses =
                      "inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800";
                  }

                  const priority = req.priority || "";
                  let priorityClasses = "text-gray-500";
                  if (priority === "High") {
                    priorityClasses = "text-red-500 font-medium";
                  } else if (priority === "Medium") {
                    priorityClasses = "text-yellow-600 font-medium";
                  }

                  return (
                    <tr key={req.id}>
                      <td className="h-[72px] px-4 py-2 text-sm text-gray-500">
                        {req.id}
                      </td>
                      <td className="h-[72px] px-4 py-2 text-sm font-medium text-gray-900">
                        <Link
                          href={`/requests/${req.id}`}
                          className="hover:underline"
                        >
                          {req.title}
                        </Link>
                      </td>
                      <td className="h-[72px] px-4 py-2 text-sm text-gray-500">
                        {(req as any).asset?.name ?? req.assetId ?? "—"}
                      </td>
                      <td className="h-[72px] px-4 py-2 text-sm text-gray-500">
                        {req.createdBy ?? "—"}
                      </td>
                      <td className="h-[72px] px-4 py-2 text-sm">
                        <div className={statusClasses}>
                          <span className="size-2 rounded-full bg-current" />
                          <span>{status}</span>
                        </div>
                      </td>
                      <td
                        className={`h-[72px] px-4 py-2 text-sm ${priorityClasses}`}
                      >
                        {priority || "—"}
                      </td>
                      <td className="h-[72px] px-4 py-2 text-sm text-gray-500">
                        {req.dueDate
                          ? new Date(req.dueDate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="h-[72px] px-4 py-2 text-sm">
                        {req.status === "Open" && (
                          <div className="flex flex-wrap gap-2">
                            <form action={approveRequest}>
                              <button
                                type="submit"
                                name="requestId"
                                value={req.id}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
                              >
                                Approve
                              </button>
                            </form>
                            <form action={rejectRequest}>
                              <button
                                type="submit"
                                name="requestId"
                                value={req.id}
                                className="px-2 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700"
                              >
                                Reject
                              </button>
                            </form>
                          </div>
                        )}
                        {req.status === "Approved" && (
                          <form action={convertRequestToWorkOrder}>
                            <button
                              type="submit"
                              name="requestId"
                              value={req.id}
                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
                            >
                              Convert to Work Order
                            </button>
                          </form>
                        )}
                        {req.status === "Converted" && (
                          <button
                            type="button"
                            disabled
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded-md cursor-default"
                          >
                            Converted
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


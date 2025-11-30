import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Table from "@/components/ui/Table";
import { nanoid } from "nanoid";
import Link from "next/link";
import { isAdminLike, isMasterAdmin } from "@/lib/roles";
import { getScopedStoreId, canSeeAllStores } from "@/lib/storeAccess";
import StoreFilter from "@/components/StoreFilter";

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

  if (!isAdmin) {
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

  const [requests, stores] = await Promise.all([
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

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Maintenance Requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            Approve, reject, or convert maintenance requests into work orders.
          </p>
        </div>
        {isMasterAdmin(role) && stores.length > 0 && (
          <StoreFilter
            stores={stores as any}
            selectedStoreId={selectedStoreId ?? null}
            label="Store"
          />
        )}
      </div>

      {requests.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 bg-white">
          No maintenance requests have been submitted yet.
        </div>
      ) : (
        <Table
          headers={[
            "Title",
            "Asset",
            "Priority",
            "Status",
            "Created By",
            "Created At",
            "Actions",
          ]}
        >
          {requests.map((req) => (
            <tr key={req.id}>
              <td className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-900">
                <Link
                  href={`/requests/${req.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {req.title}
                </Link>
              </td>
              <td className="px-4 py-2 text-xs sm:text-sm">
                {(req as any).asset?.name ?? req.assetId ?? "—"}
              </td>
              <td className="px-4 py-2 text-xs sm:text-sm">{req.priority}</td>
              <td className="px-4 py-2 text-xs sm:text-sm">{req.status}</td>
              <td className="px-4 py-2 text-xs sm:text-sm">
                {req.createdBy ?? "—"}
              </td>
              <td className="px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
                {req.createdAt.toLocaleString()}
              </td>
              <td className="px-4 py-2 text-xs sm:text-sm">
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
          ))}
        </Table>
      )}
    </div>
  );
}

export async function approveRequest(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);
  if (!isAdminLike((session?.user as any)?.role)) redirect("/workorders");

  const requestId = formData.get("requestId") as string | null;
  if (!requestId) {
    redirect("/requests");
  }

  await prisma.request.update({
    where: { id: requestId },
    data: { status: "Approved" },
  });

  redirect("/requests");
}

export async function rejectRequest(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);
  if (!isAdminLike((session?.user as any)?.role)) redirect("/workorders");

  const requestId = formData.get("requestId") as string | null;
  if (!requestId) {
    redirect("/requests");
  }

  await prisma.request.update({
    where: { id: requestId },
    data: { status: "Rejected" },
  });

  redirect("/requests");
}

export async function convertRequestToWorkOrder(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);
  if (!isAdminLike((session?.user as any)?.role)) redirect("/workorders");

  const requestId = formData.get("requestId") as string | null;
  if (!requestId) {
    redirect("/requests");
  }

  const request = await prisma.request.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    redirect("/requests");
  }

  // For now, only allow conversion when the request has an assetId,
  // to respect the existing WorkOrder schema (assetId is required).
  if (!request.assetId) {
    redirect("/requests");
  }

  await prisma.workOrder.create({
    data: {
      id: nanoid(),
      title: `Request: ${request.title}`,
      description: request.description,
      assetId: request.assetId,
      status: "Open",
      priority: request.priority,
      dueDate: null,
      assignedToId: null,
    },
  });

  await prisma.request.update({
    where: { id: requestId },
    data: { status: "Converted" },
  });

  redirect("/workorders");
}


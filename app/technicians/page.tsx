import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isAdminLike,
  isTechnician as isTechnicianRole,
  isMasterAdmin,
} from "@/lib/roles";
import { canSeeAllStores, getScopedStoreId } from "@/lib/storeAccess";
import StoreFilter from "@/components/StoreFilter";
import AddTechnicianDrawer from "./components/AddTechnicianDrawer";
import CreateTechnicianUserDrawer from "./components/CreateTechnicianUserDrawer";
import ToggleTechnicianActive from "./components/ToggleTechnicianActive";

export const dynamic = "force-dynamic";

type TechnicianWithWorkOrders = Prisma.TechnicianGetPayload<{
  include: {
    workOrders: true;
    users: true;
  };
}>;

export default async function TechniciansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  const role = (session?.user as any)?.role as string | undefined;
  const isMaster = isMasterAdmin(role);

  // Technicians must not see this page at all.
  if (!session || isTechnicianRole(role) || !isAdminLike(role)) {
    redirect("/workorders");
  }

  const userStoreId = ((session.user as any)?.storeId ?? null) as
    | string
    | null;

  const selectedStoreId =
    typeof params.storeId === "string" ? params.storeId : undefined;

  let currentStoreName = "All Stores";

  if (isMaster) {
    if (selectedStoreId) {
      const store = await prisma.store.findUnique({
        where: { id: selectedStoreId },
      });
      if (store) currentStoreName = store.name;
    }
  } else {
    const store = userStoreId
      ? await prisma.store.findUnique({
          where: { id: userStoreId },
        })
      : null;
    if (store) currentStoreName = store.name;
  }

  const techWhere: any = {};

  if (!canSeeAllStores(role)) {
    const scopedStoreId = getScopedStoreId(role, userStoreId);
    if (scopedStoreId) {
      techWhere.storeId = scopedStoreId;
    } else {
      techWhere.storeId = "__never_match__";
    }
  } else if (selectedStoreId) {
    techWhere.storeId = selectedStoreId;
  }

  const technicians = await prisma.technician.findMany({
    where: techWhere,
    orderBy: { name: "asc" },
    include: {
      workOrders: true,
      users: true,
    },
  });

  let stores: { id: string; name: string; code?: string | null }[] = [];

  if (isMaster) {
    stores = await prisma.store.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });
  }

  return (
    <div className="px-2 sm:px-4 md:px-6 py-4 md:py-8 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
            Technicians — {currentStoreName}
          </h1>
          <p className="text-sm text-gray-600">
            View all technicians and their workload.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
          {isMaster && stores.length > 0 && (
            <StoreFilter
              stores={stores}
              selectedStoreId={selectedStoreId ?? null}
              label="Store"
            />
          )}
          {isAdminLike(role) && !isTechnicianRole(role) && (
            <AddTechnicianDrawer isMasterAdmin={isMaster} stores={stores} />
          )}
        </div>
      </div>

      {technicians.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 bg-white">
          No technicians found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Open WOs</th>
                <th className="px-4 py-3">Total WOs</th>
                <th className="px-4 py-3">Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {technicians.map((tech: TechnicianWithWorkOrders) => {
                const openCount = tech.workOrders.filter(
                  (wo) => wo.status !== "Completed" && wo.status !== "Cancelled"
                ).length;

                return (
                  <tr
                    key={tech.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {tech.name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{tech.email}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {tech.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 space-y-1">
                      <span
                        className={
                          tech.active
                            ? "inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                            : "inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                        }
                      >
                        {tech.active ? "Active" : "Inactive"}
                      </span>
                      <div className="mt-1">
                        <ToggleTechnicianActive id={tech.id} active={tech.active} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{openCount}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {tech.workOrders.length}
                    </td>
                    <td className="px-4 py-3">
                      <CreateTechnicianUserDrawer
                        technicianId={tech.id}
                        technicianName={tech.name}
                        technicianEmail={tech.email}
                        hasLogin={Array.isArray((tech as any).users) && (tech as any).users.length > 0}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}



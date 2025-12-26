import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";

import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isAdminLike,
  isTechnician as isTechnicianRole,
  isMasterAdmin,
} from "@/lib/roles";
import { canSeeAllStores, getScopedStoreId } from "@/lib/storeAccess";
import StoreFilter from "@/components/StoreFilter";
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
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }
  
  const role = (session.user as any)?.role;
  
  // STORE_ADMIN should not access technicians page
  if (role === "STORE_ADMIN") {
    redirect("/workorders");
  }
  
  if (!isAdminLike(role)) {
    redirect("/workorders");
  }
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

  const searchQuery =
    typeof params.q === "string" && params.q.trim().length > 0
      ? params.q.trim()
      : "";

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

  const techWhere: Prisma.TechnicianWhereInput = {};

  if (searchQuery) {
    techWhere.OR = [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { email: { contains: searchQuery, mode: "insensitive" } },
      { phone: { contains: searchQuery, mode: "insensitive" } },
    ];
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
    <div className="px-2 sm:px-4 md:px-6 py-4 md:py-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Technician List
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your team of technicians and their assignments.
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Scope: {currentStoreName}
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
            <Link
              href="/technicians/new"
              className="inline-flex items-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600"
            >
              Add Technician
            </Link>
          )}
        </div>
      </header>

      {/* Search + filters + table card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          {/* Search */}
          <form
            className="relative w-full md:max-w-md"
            action="/technicians"
            method="get"
          >
            <input
              name="q"
              defaultValue={searchQuery}
              className="w-full bg-gray-50 border border-gray-300 rounded pl-10 pr-4 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Search technicians by name, email, or phone..."
              type="text"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              🔍
            </span>
          </form>

          {/* Simple filter/sort placeholders to match design */}
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

        {technicians.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 bg-white">
            No technicians found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Technician ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Full Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Primary Skill
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Work Orders
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {technicians.map((tech: TechnicianWithWorkOrders) => {
                  const openCount = tech.workOrders.filter(
                    (wo) =>
                      wo.status !== "Completed" && wo.status !== "Cancelled"
                  ).length;

                  const statusLabel = tech.active ? "Available" : "Inactive";
                  const statusClasses = tech.active
                    ? "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    : "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700";

                  return (
                    <tr key={tech.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tech.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {tech.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {/* No primary skill field yet; placeholder */}
                        —
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={statusClasses}>{statusLabel}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tech.email}
                        <br />
                        {tech.phone ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {openCount} open / {tech.workOrders.length} total
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <ToggleTechnicianActive
                          id={tech.id}
                          active={tech.active}
                        />
                        {Array.isArray((tech as any).users) &&
                        (tech as any).users.length > 0 ? (
                          <span className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Login created
                          </span>
                        ) : (
                          <span className="mt-2 inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
                            No login
                          </span>
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



import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMasterAdmin } from "@/lib/roles";
import AddStoreDrawer from "./components/AddStoreDrawer";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const session = await getServerSession(authOptions);

  if (!session || !isMasterAdmin((session.user as any)?.role)) {
    // Follow existing convention for admin-only pages.
    redirect("/workorders");
  }

  const stores = await prisma.store.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="px-2 sm:px-4 md:px-6 py-4 md:py-8 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
            Stores
          </h1>
          <p className="text-sm text-gray-600">
            Manage your maintenance locations. Assign users and technicians to
            specific stores for scoped access in future phases.
          </p>
        </div>
        <AddStoreDrawer />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Timezone</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stores.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-sm text-gray-500"
                >
                  No stores defined yet. Use the &ldquo;Add Store&rdquo; button
                  to create your first location.
                </td>
              </tr>
            ) : (
              stores.map((store) => (
                <tr key={store.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {store.name}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {store.code ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {store.city ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {store.state ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {store.timezone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs">
                    {store.createdAt.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}



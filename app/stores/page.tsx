import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMasterAdmin, isAdminLike, isStoreAdmin } from "@/lib/roles";
import AddStoreDrawer from "./components/AddStoreDrawer";
import StoresTable from "./components/StoresTable";
import ManageCategoriesDrawer from "./components/ManageCategoriesDrawer";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const userStoreId = ((session?.user as any)?.storeId ?? null) as string | null;

  // Allow MASTER_ADMIN and ADMIN to access stores page
  // STORE_ADMIN should not access stores page
  if (!session || !isAdminLike(role) || isStoreAdmin(role)) {
    redirect("/workorders");
  }

  const isMaster = isMasterAdmin(role);
  const isStoreScopedAdmin = isStoreAdmin(role);

  // Build where clause:
  // - MASTER_ADMIN and ADMIN see all stores
  // - STORE_ADMIN sees only their own store (if they have a storeId)
  let whereClause = {};
  if (isStoreScopedAdmin) {
    // STORE_ADMIN: only their store
    if (userStoreId) {
      whereClause = { id: userStoreId };
    } else {
      // No storeId means they see nothing (use a non-existent ID)
      whereClause = { id: "nonexistent-store-id" };
    }
  }
  // For MASTER_ADMIN and ADMIN, whereClause remains {} (all stores)

  const stores = await (prisma as any).store.findMany({
    where: whereClause,
    include: {
      users: {
        select: {
          email: true,
          role: true,
        },
      },
      categories: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const categories = await (prisma as any).storeCategory.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Store Management</h1>
        <div className="flex items-center gap-3">
          {/* Show Manage Categories button for MASTER_ADMIN */}
          {isMaster && <ManageCategoriesDrawer />}
          {/* Show Add Store button for MASTER_ADMIN and ADMIN */}
          {(isMaster || isAdminLike(role)) && (
            <AddStoreDrawer categories={categories} />
          )}
        </div>
      </div>

      <StoresTable stores={stores} categories={categories} />
    </div>
  );
}



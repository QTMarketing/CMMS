import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMasterAdmin } from "@/lib/roles";
import AddStoreDrawer from "./components/AddStoreDrawer";
import StoresTable from "./components/StoresTable";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const session = await getServerSession(authOptions);

  if (!session || !isMasterAdmin((session.user as any)?.role)) {
    // Follow existing convention for admin-only pages.
    redirect("/workorders");
  }

  const stores = await prisma.store.findMany({
    include: {
      users: {
        select: {
          email: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Store Management</h1>
        <AddStoreDrawer />
      </div>

      <StoresTable stores={stores} />
    </div>
  );
}



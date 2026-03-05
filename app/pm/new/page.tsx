import Link from "next/link";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";
import { canSeeAllStores, getScopedStoreId } from "@/lib/storeAccess";
import NewPmScheduleForm from "../NewPmScheduleForm";

export default async function NewPmSchedulePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role;
  const isAdmin = isAdminLike(role);

  if (!isAdmin) {
    // Reuse existing behaviour: only admin-like roles may create PM schedules
    return null;
  }

  const userStoreId = ((session.user as any)?.storeId ?? null) as
    | string
    | null;

  // Determine accessible stores for this user
  let stores: { id: string; name: string; code: string | null }[] = [];
  const canSeeAll = canSeeAllStores(role);

  if (canSeeAll) {
    stores = await prisma.store.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    });
  } else if (userStoreId) {
    const store = await prisma.store.findUnique({
      where: { id: userStoreId },
      select: { id: true, name: true, code: true },
    });
    stores = store ? [store] : [];
  }

  // Compute the store scope for loading assets
  const scopedStoreId = getScopedStoreId(role, userStoreId);

  const assets = await prisma.asset.findMany({
    where: scopedStoreId ? { storeId: scopedStoreId } : {},
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      storeId: true,
    },
  });

  const today = new Date();
  const defaultDate = today.toISOString().slice(0, 10);

  const serializableAssets = assets.map((a) => ({
    id: a.id,
    name: a.name,
    storeId: a.storeId ?? null,
  }));

  const serializableStores = stores.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code ?? null,
  }));

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">New PM Schedule</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a new preventive maintenance schedule. This does not
            generate work orders directly.
          </p>
        </div>
        <Link
          href="/pm"
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Back to all PM schedules
        </Link>
      </div>

      <NewPmScheduleForm
        defaultDate={defaultDate}
        assets={serializableAssets}
        stores={serializableStores}
        canSeeAllStores={canSeeAll}
        userStoreId={userStoreId}
      />
    </div>
  );
}



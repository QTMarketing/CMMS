import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminLike, isMasterAdmin } from "@/lib/roles";
import StoreDetailTabs from "./StoreDetailTabs";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StoreDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !isAdminLike((session.user as any)?.role)) {
    redirect("/workorders");
  }

  const role = (session.user as any)?.role as string | undefined;
  const userStoreId = ((session.user as any)?.storeId ?? null) as
    | string
    | null;
  const isMaster = isMasterAdmin(role);

  // Non-master admins can only view their own store
  if (!isMaster && userStoreId && userStoreId !== id) {
    redirect("/stores");
  }

  const store = await prisma.store.findUnique({
    where: { id },
  });

  if (!store) {
    notFound();
  }

  const [assets, parts, requests, schedules] = await Promise.all([
    prisma.asset.findMany({
      where: { storeId: id },
      select: {
        id: true,
        name: true,
        assetId: true,
        location: true,
        status: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.inventoryItem.findMany({
      where: { storeId: id },
      select: {
        id: true,
        name: true,
        partNumber: true,
        quantityOnHand: true,
        reorderThreshold: true,
        location: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.request.findMany({
      where: { storeId: id },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.preventiveSchedule.findMany({
      where: { storeId: id },
      select: {
        id: true,
        title: true,
        nextDueDate: true,
        asset: {
          select: { name: true },
        },
      },
      orderBy: { nextDueDate: "asc" },
      take: 50,
    }),
  ]);

  const serializableStore = {
    id: store.id,
    name: store.name,
    code: store.code ?? null,
    address: store.address ?? null,
    city: store.city ?? null,
    state: store.state ?? null,
    zipCode: (store as any).zipCode ?? null,
  };

  const serializableSchedules = schedules.map((s) => ({
    id: s.id,
    title: s.title,
    assetName: s.asset?.name ?? null,
    nextDueDate: s.nextDueDate ? s.nextDueDate.toISOString() : null,
  }));

  return (
    <StoreDetailTabs
      store={serializableStore}
      assets={assets}
      parts={parts}
      requests={requests.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      }))}
      schedules={serializableSchedules}
    />
  );
}



import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminLike, isMasterAdmin } from "@/lib/roles";
import StorePageShell from "../components/StorePageShell";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StorePartsPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !isAdminLike((session.user as any)?.role)) {
    redirect("/workorders");
  }

  const role = (session.user as any)?.role as string | undefined;
  const userStoreId = ((session.user as any)?.storeId ?? null) as string | null;
  const isMaster = isMasterAdmin(role);

  if (!isMaster && userStoreId && userStoreId !== id) {
    redirect("/stores");
  }

  const store = await prisma.store.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!store) {
    notFound();
  }

  return (
    <StorePageShell store={store} title="Parts">
      <div className="p-6 text-gray-500 border-t border-gray-100">
        Parts table placeholder — content will be filled later.
      </div>
    </StorePageShell>
  );
}

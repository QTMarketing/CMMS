import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";

/**
 * GET /api/districts/:id/stores
 * Returns all stores under a district.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as string | undefined;

    if (!session || !isAdminLike(role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id: districtId } = await params;

    const district = await prisma.district.findUnique({
      where: { id: districtId },
      select: { id: true },
    });

    if (!district) {
      return NextResponse.json(
        { success: false, error: "District not found" },
        { status: 404 }
      );
    }

    const stores = await prisma.store.findMany({
      where: { districtId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: stores });
  } catch (error) {
    console.error("[districts/:id/stores] GET failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stores" },
      { status: 500 }
    );
  }
}

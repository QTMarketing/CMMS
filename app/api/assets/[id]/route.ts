import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        parentAsset: {
          select: {
            id: true,
            assetId: true,
            name: true,
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json(
        { success: false, error: "Asset not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: asset });
  } catch (err) {
    console.error("Error fetching asset:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch asset" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;
    const role = sessionUser?.role as string | undefined;
    const userStoreId = (sessionUser?.storeId ?? null) as string | null;

    if (!session || !isAdminLike(role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await prisma.asset.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Asset not found" },
        { status: 404 }
      );
    }

    if (role === "STORE_ADMIN" && existing.storeId && existing.storeId !== userStoreId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    await prisma.asset.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[assets DELETE] Failed", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete asset" },
      { status: 500 }
    );
  }
}

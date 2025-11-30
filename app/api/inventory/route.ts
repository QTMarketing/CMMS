import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { canSeeAllStores, getScopedStoreId } from "@/lib/storeAccess";
import { isAdminLike, isMasterAdmin } from "@/lib/roles";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const role = (session.user as any)?.role as string | undefined;
  const userStoreId = ((session.user as any)?.storeId ?? null) as
    | string
    | null;

  const where: any = {};
  const urlStoreId = req.nextUrl.searchParams.get("storeId") || null;

  if (canSeeAllStores(role)) {
    if (urlStoreId) {
      where.storeId = urlStoreId;
    }
  } else {
    const scopedStoreId = getScopedStoreId(role, userStoreId);
    if (scopedStoreId) {
      where.storeId = scopedStoreId;
    } else {
      where.storeId = "__never_match__";
    }
  }

  const items = await prisma.inventoryItem.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ success: true, data: items });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isAdminLike((session.user as any)?.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const role = (session.user as any)?.role as string | undefined;
    const userStoreId = ((session.user as any)?.storeId ?? null) as
      | string
      | null;

    const body = await req.json();
    const {
      name,
      partNumber,
      quantityOnHand,
      reorderThreshold,
      location,
      storeId: bodyStoreId,
    } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Name is required." },
        { status: 400 }
      );
    }

    const qty =
      typeof quantityOnHand === "number"
        ? quantityOnHand
        : Number.parseInt(String(quantityOnHand ?? "0"), 10);
    const threshold =
      typeof reorderThreshold === "number"
        ? reorderThreshold
        : Number.parseInt(String(reorderThreshold ?? "0"), 10);

    if (!Number.isFinite(qty) || qty < 0) {
      return NextResponse.json(
        { success: false, error: "quantityOnHand must be a non-negative number." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(threshold) || threshold < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "reorderThreshold must be a non-negative number.",
        },
        { status: 400 }
      );
    }

    let storeId: string | null = null;

    if (isMasterAdmin(role)) {
      if (!bodyStoreId || typeof bodyStoreId !== "string") {
        return NextResponse.json(
          { success: false, error: "storeId is required for inventory items." },
          { status: 400 }
        );
      }
      storeId = bodyStoreId.trim();
    } else {
      storeId = userStoreId;
    }

    if (!storeId) {
      return NextResponse.json(
        {
          success: false,
          error: "Your user account is not associated with a store.",
        },
        { status: 400 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Invalid store selected." },
        { status: 400 }
      );
    }

    const item = await prisma.inventoryItem.create({
      data: {
        id: crypto.randomUUID(),
        name: name.trim(),
        partNumber:
          typeof partNumber === "string" && partNumber.trim().length > 0
            ? partNumber.trim()
            : "",
        quantityOnHand: qty,
        reorderThreshold: threshold,
        location:
          typeof location === "string" && location.trim().length > 0
            ? location.trim()
            : null,
        storeId: store.id,
      },
    });

    return NextResponse.json(
      { success: true, data: item },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating inventory item:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create inventory item." },
      { status: 500 }
    );
  }
}

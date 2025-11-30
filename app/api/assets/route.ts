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

  const items = await prisma.asset.findMany({ where });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const {
      name,
      location,
      status,
      storeId: bodyStoreId,
    } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Name is required." },
        { status: 400 }
      );
    }

    const normalizedStatus =
      typeof status === "string" && status.trim().length > 0
        ? status.trim()
        : "Active";

    let storeId: string | null = null;

    if (isMasterAdmin(role)) {
      if (!bodyStoreId || typeof bodyStoreId !== "string") {
        return NextResponse.json(
          { success: false, error: "storeId is required for assets." },
          { status: 400 }
        );
      }
      storeId = bodyStoreId.trim();
    } else {
      // STORE_ADMIN: use their own storeId
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

    const asset = await prisma.asset.create({
      data: {
        id: crypto.randomUUID(),
        name: name.trim(),
        location:
          typeof location === "string" && location.trim().length > 0
            ? location.trim()
            : "",
        status: normalizedStatus,
        storeId: store.id,
      },
    });

    return NextResponse.json(
      { success: true, data: asset },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating asset:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create asset." },
      { status: 500 }
    );
  }
}

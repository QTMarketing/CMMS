import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";
import { canSeeAllStores, getScopedStoreId } from "@/lib/storeAccess";

export async function GET(req: NextRequest) {
  try {
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

    const urlStoreId = req.nextUrl.searchParams.get("storeId") || null;

    let where: any = {
      role: "BACKOFFICE",
    };

    // Scope by store when appropriate
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

    const users = await prisma.user.findMany({
      where,
      orderBy: { email: "asc" },
      select: {
        id: true,
        email: true,
        role: true,
        storeId: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching backoffice users:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch backoffice users" },
      { status: 500 }
    );
  }
}


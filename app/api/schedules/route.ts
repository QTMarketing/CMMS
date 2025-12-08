import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";
import { canSeeAllStores, getScopedStoreId } from "@/lib/storeAccess";

function getDaysUntilDue(dueDate: string) {
  const today = new Date();
  const due = new Date(dueDate);
  today.setUTCHours(0,0,0,0);
  due.setUTCHours(0,0,0,0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET(req: NextRequest) {
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
    const urlStoreId = req.nextUrl.searchParams.get("storeId") || null;

    const where: any = {};

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

    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    const schedules = await prisma.preventiveSchedule.findMany({ where });
    const data = schedules.map((s) => {
      const daysUntilDue = getDaysUntilDue(s.nextDueDate.toISOString());
      const due = daysUntilDue <= 0 && s.active;
      return {
        ...s,
        daysUntilDue,
        due,
      };
    });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Error fetching schedules:", err);
    // Fail soft with empty list so UI can still render
    return NextResponse.json(
      { success: true, data: [] },
      { status: 200 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";

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

    const existing = await prisma.preventiveSchedule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "PM schedule not found" },
        { status: 404 }
      );
    }

    if (role === "STORE_ADMIN" && existing.storeId && existing.storeId !== userStoreId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    await prisma.preventiveSchedule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[schedules DELETE] Failed", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete PM schedule" },
      { status: 500 }
    );
  }
}



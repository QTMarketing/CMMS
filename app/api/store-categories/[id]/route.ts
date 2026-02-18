import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isMasterAdmin } from "@/lib/roles";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as string | undefined;

    if (!session || !isMasterAdmin(role)) {
      return NextResponse.json(
        { success: false, error: "Only MASTER_ADMIN can delete categories" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await (prisma as any).storeCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Category not found." },
        { status: 404 }
      );
    }

    // Delete the category (Prisma will automatically remove the relation from stores)
    await (prisma as any).storeCategory.delete({
      where: { id },
    });

    return NextResponse.json(
      { success: true, message: "Category deleted successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[store-categories] Failed to delete category", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete category" },
      { status: 500 }
    );
  }
}

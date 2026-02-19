import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";

/**
 * GET /api/divisions/:id/districts
 * Returns all districts under a division.
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

    const { id: divisionId } = await params;

    const division = await prisma.division.findUnique({
      where: { id: divisionId },
      select: { id: true },
    });

    if (!division) {
      return NextResponse.json(
        { success: false, error: "Division not found" },
        { status: 404 }
      );
    }

    const districts = await prisma.district.findMany({
      where: { divisionId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: districts });
  } catch (error) {
    console.error("[divisions/:id/districts] GET failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch districts" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";

/**
 * GET /api/divisions
 * Returns all divisions with their districts and stores nested (full tree).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as string | undefined;

    if (!session || !isAdminLike(role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const divisions = await prisma.division.findMany({
      orderBy: { name: "asc" },
      include: {
        districts: {
          orderBy: { name: "asc" },
          include: {
            stores: {
              orderBy: { name: "asc" },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: divisions });
  } catch (error) {
    console.error("[divisions] GET failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch divisions" },
      { status: 500 }
    );
  }
}

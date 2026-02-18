import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike, isMasterAdmin } from "@/lib/roles";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isAdminLike((session.user as any)?.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const categories = await (prisma as any).storeCategory.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("[store-categories] Failed to fetch categories", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as string | undefined;

    if (!session || !isMasterAdmin(role)) {
      return NextResponse.json(
        { success: false, error: "Only MASTER_ADMIN can create categories" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, description, color } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Name is required." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    const existing = await (prisma as any).storeCategory.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A category with this name already exists." },
        { status: 400 }
      );
    }

    const category = await (prisma as any).storeCategory.create({
      data: {
        name: trimmedName,
        description:
          typeof description === "string" && description.trim()
            ? description.trim()
            : null,
        color:
          typeof color === "string" && color.trim() ? color.trim() : null,
      },
    });

    return NextResponse.json(
      { success: true, data: category },
      { status: 201 }
    );
  } catch (error) {
    console.error("[store-categories] Failed to create category", error);
    return NextResponse.json(
      { success: false, error: "Failed to create category" },
      { status: 500 }
    );
  }
}


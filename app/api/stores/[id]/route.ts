import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike, isMasterAdmin } from "@/lib/roles";

/**
 * GET /api/stores/:id
 * Returns a single store with related: Assets, Parts (inventory), PM Schedules,
 * Work Orders, and Work Order History (notes on work orders).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;

  if (!session || !isAdminLike(role)) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      district: true,
      categories: { select: { id: true, name: true, color: true } },
      assets: { orderBy: { name: "asc" } },
      inventoryItems: { orderBy: { name: "asc" } },
      pmSchedules: {
        orderBy: { nextDueDate: "asc" },
        include: { asset: { select: { id: true, name: true } } },
      },
      workOrders: {
        orderBy: { createdAt: "desc" },
        include: {
          asset: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
          notes: { orderBy: { timestamp: "desc" } },
        },
      },
    },
  });

  if (!store) {
    return NextResponse.json(
      { success: false, error: "Store not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: store });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isMasterAdmin((session.user as any)?.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { name, code, address, city, state, zipCode, categoryIds } = body ?? {};

    const existingStore = await prisma.store.findUnique({
      where: { id },
    });

    if (!existingStore) {
      return NextResponse.json(
        { success: false, error: "Store not found." },
        { status: 404 }
      );
    }

    if (name !== undefined && (!name || typeof name !== "string" || !name.trim())) {
      return NextResponse.json(
        { success: false, error: "Name is required." },
        { status: 400 }
      );
    }

    if (code !== undefined && code !== null && typeof code !== "string") {
      return NextResponse.json(
        { success: false, error: "Code must be a string." },
        { status: 400 }
      );
    }

    // Check code uniqueness if it's being changed
    if (code !== undefined && code !== null && code.trim() && code.trim() !== existingStore.code) {
      const existingByCode = await prisma.store.findUnique({
        where: { code: code.trim() },
      });

      if (existingByCode) {
        return NextResponse.json(
          { success: false, error: "Code is already in use." },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};

    if (name !== undefined) updateData.name = name.trim();
    if (code !== undefined) updateData.code = code && code.trim() ? code.trim() : null;
    if (address !== undefined) updateData.address = address && typeof address === "string" ? address.trim() : null;
    if (city !== undefined) updateData.city = city && typeof city === "string" ? city.trim() : null;
    if (state !== undefined) updateData.state = state && typeof state === "string" ? state.trim() : null;
    if (zipCode !== undefined)
      updateData.zipCode =
        zipCode && typeof zipCode === "string" ? zipCode.trim() : null;

    if (Array.isArray(categoryIds)) {
      updateData.categories = {
        set: categoryIds.map((id: string) => ({ id })),
      };
    }

    const store = await prisma.store.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(
      { success: true, data: store },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error updating store:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update store." },
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

    if (!session || !isMasterAdmin((session.user as any)?.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existingStore = await prisma.store.findUnique({
      where: { id },
    });

    if (!existingStore) {
      return NextResponse.json(
        { success: false, error: "Store not found." },
        { status: 404 }
      );
    }

    // Check if store has related records (optional: prevent deletion if store has assets/work orders)
    // For now, we'll allow deletion but you may want to add cascading or prevent deletion

    await prisma.store.delete({
      where: { id },
    });

    return NextResponse.json(
      { success: true, message: "Store deleted successfully." },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error deleting store:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete store." },
      { status: 500 }
    );
  }
}


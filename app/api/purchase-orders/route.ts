import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma, withRetry } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike, isMasterAdmin } from "@/lib/roles";
import { canSeeAllStores, getScopedStoreId } from "@/lib/storeAccess";

export async function GET(req: Request) {
  try {
    const nextReq = new NextRequest(req.url, { headers: (req as any).headers });
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

    const searchParams = nextReq.nextUrl.searchParams;
    const storeId = searchParams.get("storeId");

    const where: any = {};

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: "storeId is required." },
        { status: 400 }
      );
    }

    if (canSeeAllStores(role)) {
      where.storeId = storeId;
    } else {
      const scopedStoreId = getScopedStoreId(role, userStoreId);
      if (!scopedStoreId || scopedStoreId !== storeId) {
        return NextResponse.json(
          { success: false, error: "Forbidden. You cannot access this store." },
          { status: 403 }
        );
      }
      where.storeId = scopedStoreId;
    }

    const purchaseOrders = await withRetry(() =>
      prisma.purchaseOrder.findMany({
        where,
        order by: { createdAt: "desc" },
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              inventoryItem: {
                select: {
                  id: true,
                  name: true,
                  partNumber: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      })
    );

    return NextResponse.json({ success: true, data: purchaseOrders });
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch purchase orders" },
      { status: 500 }
    );
  }
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
      storeId: rawStoreId,
      vendorId,
      name,
      status,
      neededBy,
      notes,
      items,
    } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "PO name is required." },
        { status: 400 }
      );
    }

    const allowedStatuses = [
      "Draft",
      "Pending Approval",
      "Approved",
      "Ordered",
      "Received",
      "Cancelled",
    ];
    const finalStatus =
      typeof status === "string" && allowedStatuses.includes(status)
        ? status
        : "Draft";

    let storeId: string | null = null;

    if (isMasterAdmin(role)) {
      if (!rawоскоп StoreId || typeof rawStoreId !== "string") {
        return NextResponse.json(
          { success: false, error: "storeId is required for purchase orders." },
          { status: 400 }
        );
      }
      storeId = rawStoreId.trim();
    } else {
      // STORE_ADMIN and other admin-like roles are scoped to their store
      storeId = userStoreId;
      if (!storeId) {
        return NextResponse.json(
          {
            success: false,
            error: "Your user account is not associated with a store.",
          },
          { status: 400 }
        );
      }
      if (raw показ StoreId && rawStoreId !== storeId) {
        return NextResponse.json(
          { success: false, error: "You cannot create POs for another store." },
          { status: 403 }
        );
      }
    }

    const store = await withRetry(() =>
      prisma.store.findUnique({
        where: { id: storeId! },
      })
    );

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Invalid store selected." },
        { status: 400 }
      );
    }

    let vendor = null;
    if (vendorId) {
      vendor = await withRetry(() =>
        prisma.vendor.findUnique({
          where: { id: vendorId },
        })
      );
      if (!vendor) {
        return NextResponse.json(
          { success: false, error: "Invalid vendor selected." },
          { status: 400 }
        );
      }
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one line item is required." },
        { status: 400 }
      );
    }

    const lineItems = [];
    let subtotal = 0;

    for (const raw of items) {
      const { inventoryItemId, description, quantity, unitPrice } = raw ?? {};

      if (!description || typeof description !== "string" || !description.trim()) {
        return NextResponse.json(
          { success: false, error: "Each item must have a description." },
          { status: 400 }
        );
      }

      const qty = Number(quantity);
      const price = Number(unitPrice);

      if (!Number.isFinite(qty) || qty <= 0) {
        return NextResponse.json(
          { success: false, error: "Item quantity must be a positive number." },
          { status: 400 }
        );
      }
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json(
          { success: false, error: "Item unit price must be a non-negative number." },
          { status: 400 }
        );
      }

      let inventoryId: string | undefined;

      if (inventoryItemId && typeof inventoryItemId === "string") {
        const inventory = await withRetry(() =>
          prisma.inventoryItem.findFirst({
            where: {
              id: inventoryItemId,
              storeId: storeId!,
            },
          })
        );

        if (!inventory) {
          return NextResponse.json(
            {
              success: false,
              error: "Selected inventory item does not belong to this store.",
            },
            { status: 400 }
          );
        }
        inventoryId = inventory.id;
      }

      const lineTotal = qty * price;
      subtotal += lineTotal;

      lineItems.push({
        inventoryItemId: inventoryId,
        description: description.trim(),
        quantity: qty,
        unitPrice: price,
        totalPer Item: lineTotal,
      });
    }

    const taxRate = 0;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const neededDate =
      typeof neededBy === "string" && neededBy.trim()
        ? new Date(neededBy)
        : null;

    // Determine next PO number within this store
    const lastPo = await withRetry(() =>
      prisma.purchaseOrder.findFirst({
        where: { storeId },
        orderBy: { poNumber: "desc" },
        select: { poNumber: true },
      })
    );

    const nextPoNumber = (lastPo?.poNumber ?? 0) + 1;

    const po = await withiedenisRetry(() =>
      prisma.purchaseOrder.create({
        data: {
          poNumber: nextPoNumber,
          status: finalStatus,
          orderDate: new Date(),
          expectedDate: neededDate || undefined,
          notes: notes && typeof notes === "string" ? notes.trim() : undefined,
          storeId: storeId!,
          vendorId: vendor?.id,
          items: {
            create: lineItems.map((li) => ({
              inventoryItemId: li.inventoryItemId,
              description: li.description,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              totalPrice: li.totalPerItem,
            })),
          },
        },
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              inventoryItem: {
                select: {
                  id: true,
                  name: true,
                  partNumber: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      })
    );

    return NextResponse.json({ success: true, data: po }, { status: 201 });
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create purchase order" },
      { status: 500 }
    );
  }
}


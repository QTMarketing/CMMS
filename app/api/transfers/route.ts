import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const workOrderId = req.nextUrl.searchParams.get("workOrderId");
    const assetId = req.nextUrl.searchParams.get("assetId");
    const inventoryItemId = req.nextUrl.searchParams.get("inventoryItemId");
    const storeId = req.nextUrl.searchParams.get("storeId");

    const where: any = {};

    if (workOrderId) {
      where.workOrderId = workOrderId;
    }
    if (assetId) {
      where.assetId = assetId;
    }
    if (inventoryItemId) {
      where.inventoryItemId = inventoryItemId;
    }
    if (storeId) {
      where.OR = [
        { fromStoreId: storeId },
        { toStoreId: storeId },
      ];
    }

    const transfers = await prisma.transfer.findMany({
      where,
      include: {
        fromStore: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        toStore: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        asset: {
          select: {
            id: true,
            name: true,
            assetId: true,
          },
        },
        inventoryItem: {
          select: {
            id: true,
            name: true,
            partNumber: true,
          },
        },
        workOrder: {
          select: {
            id: true,
            title: true,
          },
        },
        transferredBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: transfers });
  } catch (err) {
    console.error("Error fetching transfers:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch transfers." },
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

    const userId = (session.user as any)?.id as string | undefined;
    const body = await req.json();
    const {
      type,
      assetId,
      inventoryItemId,
      quantity,
      fromStoreId,
      toStoreId,
      workOrderId,
      notes,
    } = body ?? {};

    // Validate type
    if (type !== "ASSET" && type !== "INVENTORY") {
      return NextResponse.json(
        { success: false, error: "Type must be ASSET or INVENTORY." },
        { status: 400 }
      );
    }

    // Validate based on type
    if (type === "ASSET") {
      if (!assetId || typeof assetId !== "string") {
        return NextResponse.json(
          { success: false, error: "assetId is required for ASSET transfers." },
          { status: 400 }
        );
      }
    } else if (type === "INVENTORY") {
      if (!inventoryItemId || typeof inventoryItemId !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: "inventoryItemId is required for INVENTORY transfers.",
          },
          { status: 400 }
        );
      }
      if (!quantity || typeof quantity !== "number" || quantity <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: "quantity must be a positive number for INVENTORY transfers.",
          },
          { status: 400 }
        );
      }
    }

    // Validate stores
    if (!fromStoreId || typeof fromStoreId !== "string") {
      return NextResponse.json(
        { success: false, error: "fromStoreId is required." },
        { status: 400 }
      );
    }

    if (!toStoreId || typeof toStoreId !== "string") {
      return NextResponse.json(
        { success: false, error: "toStoreId is required." },
        { status: 400 }
      );
    }

    if (fromStoreId === toStoreId) {
      return NextResponse.json(
        { success: false, error: "From store and to store must be different." },
        { status: 400 }
      );
    }

    // Verify stores exist
    const [fromStore, toStore] = await Promise.all([
      prisma.store.findUnique({ where: { id: fromStoreId } }),
      prisma.store.findUnique({ where: { id: toStoreId } }),
    ]);

    if (!fromStore) {
      return NextResponse.json(
        { success: false, error: "From store not found." },
        { status: 404 }
      );
    }

    if (!toStore) {
      return NextResponse.json(
        { success: false, error: "To store not found." },
        { status: 404 }
      );
    }

    // Verify asset or inventory item exists and belongs to fromStore
    if (type === "ASSET") {
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
      });

      if (!asset) {
        return NextResponse.json(
          { success: false, error: "Asset not found." },
          { status: 404 }
        );
      }

      if (asset.storeId !== fromStoreId) {
        return NextResponse.json(
          {
            success: false,
            error: "Asset does not belong to the from store.",
          },
          { status: 400 }
        );
      }

      // Update asset store
      await prisma.asset.update({
        where: { id: assetId },
        data: { storeId: toStoreId },
      });
    } else if (type === "INVENTORY") {
      const inventoryItem = await prisma.inventoryItem.findUnique({
        where: { id: inventoryItemId },
      });

      if (!inventoryItem) {
        return NextResponse.json(
          { success: false, error: "Inventory item not found." },
          { status: 404 }
        );
      }

      if (inventoryItem.storeId !== fromStoreId) {
        return NextResponse.json(
          {
            success: false,
            error: "Inventory item does not belong to the from store.",
          },
          { status: 400 }
        );
      }

      if (inventoryItem.quantityOnHand < quantity) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient quantity. Available: ${inventoryItem.quantityOnHand}, Requested: ${quantity}`,
          },
          { status: 400 }
        );
      }

      // Check if item exists in destination store
      const existingItem = await prisma.inventoryItem.findFirst({
        where: {
          partNumber: inventoryItem.partNumber,
          storeId: toStoreId,
        },
      });

      if (existingItem) {
        // Update quantity in destination store
        await prisma.inventoryItem.update({
          where: { id: existingItem.id },
          data: {
            quantityOnHand: existingItem.quantityOnHand + quantity,
          },
        });
      } else {
        // Create new inventory item in destination store
        await prisma.inventoryItem.create({
          data: {
            id: crypto.randomUUID(),
            name: inventoryItem.name,
            partNumber: inventoryItem.partNumber,
            quantityOnHand: quantity,
            reorderThreshold: inventoryItem.reorderThreshold,
            location: inventoryItem.location,
            storeId: toStoreId,
          },
        });
      }

      // Update quantity in source store
      const newQuantity = inventoryItem.quantityOnHand - quantity;
      await prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          quantityOnHand: newQuantity,
        },
      });
    }

    // Verify work order if provided
    if (workOrderId) {
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
      });
      if (!workOrder) {
        return NextResponse.json(
          { success: false, error: "Work order not found." },
          { status: 404 }
        );
      }
    }

    // Create transfer record
    const transfer = await prisma.transfer.create({
      data: {
        id: crypto.randomUUID(),
        type,
        assetId: type === "ASSET" ? assetId : null,
        inventoryItemId: type === "INVENTORY" ? inventoryItemId : null,
        quantity: type === "INVENTORY" ? quantity : 1,
        fromStoreId,
        toStoreId,
        workOrderId: workOrderId || null,
        transferredById: userId || null,
        notes: notes && typeof notes === "string" ? notes.trim() : null,
      },
      include: {
        fromStore: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        toStore: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        asset: {
          select: {
            id: true,
            name: true,
            assetId: true,
          },
        },
        inventoryItem: {
          select: {
            id: true,
            name: true,
            partNumber: true,
          },
        },
        workOrder: {
          select: {
            id: true,
            title: true,
          },
        },
        transferredBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      { success: true, data: transfer },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating transfer:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create transfer." },
      { status: 500 }
    );
  }
}





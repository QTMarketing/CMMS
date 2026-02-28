import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      qrCode,
      title,
      location,
      assetId,
      problemDescription,
      helpDescription,
      priority,
      partsRequired,
      attachments,
    } = body ?? {};

    // Validate QR code
    if (!qrCode || typeof qrCode !== "string") {
      return NextResponse.json(
        { success: false, error: "QR code is required." },
        { status: 400 }
      );
    }

    // Find store by QR code
    const store = await prisma.store.findUnique({
      where: { qrCode: qrCode },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Invalid QR code." },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Title is required." },
        { status: 400 }
      );
    }
    // Location is now optional - store location will be used instead
    // Asset is now optional - only validate if provided
    if (assetId && typeof assetId !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid asset ID." },
        { status: 400 }
      );
    }
    if (!problemDescription || typeof problemDescription !== "string" || !problemDescription.trim()) {
      return NextResponse.json(
        { success: false, error: "Problem description is required." },
        { status: 400 }
      );
    }
    if (!helpDescription || typeof helpDescription !== "string" || !helpDescription.trim()) {
      return NextResponse.json(
        { success: false, error: "Help description is required." },
        { status: 400 }
      );
    }
    if (!priority || typeof priority !== "string") {
      return NextResponse.json(
        { success: false, error: "Priority is required." },
        { status: 400 }
      );
    }
    if (!["Low", "Medium", "High"].includes(priority)) {
      return NextResponse.json(
        { success: false, error: "Invalid priority." },
        { status: 400 }
      );
    }

    // Verify asset exists and belongs to the store (only if assetId is provided)
    if (assetId) {
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        select: { id: true, storeId: true },
      });

      if (!asset) {
        return NextResponse.json(
          { success: false, error: "Asset not found." },
          { status: 400 }
        );
      }

      if (asset.storeId !== store.id) {
        return NextResponse.json(
          { success: false, error: "Asset does not belong to this store." },
          { status: 400 }
        );
      }
    }

    const agg = await prisma.workOrder.aggregate({
      _max: { workOrderNumber: true },
    });
    const nextNumber = (agg._max.workOrderNumber ?? 0) + 1;

    // Create work order
    const newWorkOrder = await prisma.workOrder.create({
      data: {
        id: nanoid(),
        workOrderNumber: nextNumber,
        title: title.trim(),
        location: null, // Location removed - using store location instead
        assetId: assetId || null,
        problemDescription: problemDescription.trim(),
        helpDescription: helpDescription.trim(),
        priority: priority,
        partsRequired: partsRequired === true,
        status: "Open",
        storeId: store.id,
        attachments: Array.isArray(attachments) ? attachments : [],
        createdAt: new Date(),
      },
    });

    return NextResponse.json(
      { success: true, data: newWorkOrder },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating public work order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create work order." },
      { status: 500 }
    );
  }
}


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
    if (!location || typeof location !== "string" || !location.trim()) {
      return NextResponse.json(
        { success: false, error: "Location is required." },
        { status: 400 }
      );
    }
    if (!assetId || typeof assetId !== "string") {
      return NextResponse.json(
        { success: false, error: "Asset is required." },
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

    // Verify asset exists and belongs to the store
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

    // Create work order
    const newWorkOrder = await prisma.workOrder.create({
      data: {
        id: nanoid(),
        title: title.trim(),
        location: location.trim(),
        assetId: assetId,
        problemDescription: problemDescription.trim(),
        helpDescription: helpDescription.trim(),
        priority: priority,
        partsRequired: partsRequired === true,
        status: "Open",
        storeId: store.id,
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


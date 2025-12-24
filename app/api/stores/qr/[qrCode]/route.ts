import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> }
) {
  try {
    const { qrCode } = await params;

    if (!qrCode) {
      return NextResponse.json(
        { success: false, error: "QR code is required." },
        { status: 400 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { qrCode: qrCode },
      select: {
        id: true,
        name: true,
      },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Store not found." },
        { status: 404 }
      );
    }

    // Get assets for this store
    const assets = await prisma.asset.findMany({
      where: {
        storeId: store.id,
        status: "Active",
      },
      select: {
        id: true,
        name: true,
        location: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        store: store,
        assets: assets,
      },
    });
  } catch (error) {
    console.error("Error fetching store by QR code:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch store information." },
      { status: 500 }
    );
  }
}


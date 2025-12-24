import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import * as QRCode from "qrcode";
import { nanoid } from "nanoid";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isAdminLike((session.user as any)?.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;
    let store = await prisma.store.findUnique({
      where: { id },
      select: { id: true, qrCode: true, name: true },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Store not found." },
        { status: 404 }
      );
    }

    // Generate QR code if it doesn't exist
    if (!store.qrCode) {
      const qrCode = nanoid(32);
      store = await prisma.store.update({
        where: { id },
        data: { qrCode },
        select: { id: true, qrCode: true, name: true },
      });
    }

    // Generate QR code URL that points to the public form
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    const qrUrl = `${baseUrl}/workorder-form/${store.qrCode}`;

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      errorCorrectionLevel: "M",
      type: "image/png",
      width: 300,
      margin: 1,
    });

    return NextResponse.json({
      success: true,
      data: {
        qrCode: store.qrCode,
        qrUrl: qrUrl,
        qrImage: qrDataUrl,
        storeName: store.name,
      },
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate QR code." },
      { status: 500 }
    );
  }
}


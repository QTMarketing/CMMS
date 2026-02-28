import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

/**
 * Public file upload for the QR code work order form (no auth).
 * Validates store via qrCode and uploads to blob under that store.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fd = formData as any;
    const file = fd.get("file") as File | null;
    const qrCode = (fd.get("qrCode") as string) || (fd.get("qr_code") as string);
    const fileType = (fd.get("fileType") as string) || "workorder";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (!qrCode || typeof qrCode !== "string" || !qrCode.trim()) {
      return NextResponse.json(
        { success: false, error: "QR code is required for public uploads." },
        { status: 400 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { qrCode: qrCode.trim() },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Invalid QR code." },
        { status: 404 }
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/x-msvideo",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Only images and videos are allowed.",
        },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "File size exceeds 10MB limit." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop() || "bin";
    const filename = `${timestamp}-${randomStr}.${extension}`;
    const blobPath = `location/${store.id}/${fileType}/${filename}`;

    const putOptions: { access: "public"; token?: string } = {
      access: "public",
    };
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      putOptions.token = process.env.BLOB_READ_WRITE_TOKEN;
    }

    const blob = await put(blobPath, buffer, putOptions);

    return NextResponse.json(
      {
        success: true,
        data: {
          url: blob.url,
          filename,
          path: blob.pathname ?? blobPath,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in public upload:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

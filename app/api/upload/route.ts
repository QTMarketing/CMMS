import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

import { authOptions } from "@/lib/auth";
import { getScopedStoreId } from "@/lib/storeAccess";
import { verifyMobileToken } from "@/lib/mobileAuth";

export async function POST(req: NextRequest) {
  try {
    // Try NextAuth session first (for web)
    let session = await getServerSession(authOptions);
    let role: string | undefined;
    let userStoreId: string | null = null;

    // If no session, try mobile token
    if (!session) {
      const mobileUser = verifyMobileToken(req);
      if (mobileUser) {
        role = mobileUser.role;
        userStoreId = mobileUser.storeId || null;
      } else {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
    } else {
      role = (session.user as any)?.role as string | undefined;
      userStoreId = ((session.user as any)?.storeId ?? null) as string | null;
    }

    const formData = await req.formData();
    // Cast to any to avoid TS lib mismatch between Node and DOM FormData types
    const fd: any = formData as any;
    const file = fd.get("file") as File | null;
    const fileType = (fd.get("fileType") as string) || "workorder"; // workorder, asset, preventive-maintenance, report
    const storeIdParam = fd.get("storeId") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Determine store ID
    let storeId: string | null = null;
    if (storeIdParam) {
      storeId = storeIdParam;
    } else {
      // Use user's store ID if available
      const scopedStoreId = getScopedStoreId(role, userStoreId);
      storeId = scopedStoreId;
    }

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: "Store ID is required for file uploads." },
        { status: 400 }
      );
    }

    // Validate file type (images and videos)
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

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "File size exceeds 10MB limit." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create folder structure: location/{storeId}/{fileType}/
    const baseDir = join(process.cwd(), "public", "location", storeId, fileType);
    if (!existsSync(baseDir)) {
      await mkdir(baseDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop() || "bin";
    const filename = `${timestamp}-${randomStr}.${extension}`;
    const filepath = join(baseDir, filename);

    // Write file to disk
    await writeFile(filepath, buffer);

    // Return public URL (relative to public folder)
    const publicUrl = `/location/${storeId}/${fileType}/${filename}`;

    return NextResponse.json(
      { success: true, data: { url: publicUrl, filename } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload file" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";

import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const role = (session.user as any)?.role as string | undefined;

    if (!isAdminLike(role)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const formData = await req.formData();

    // Cast to any to avoid TS lib mismatch between Node and DOM FormData types
    const fd: any = formData as any;
    const file = fd.get("invoice") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No invoice file provided (expected field name: 'invoice')." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Allowed types: image/jpeg, image/png, image/webp, application/pdf.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "File is too large. Maximum allowed size is 10MB.",
        },
        { status: 400 }
      );
    }

    // Build a safe filename
    const originalName = file.name || "invoice";
    const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filename = `${Date.now()}-${safeName}`;
    const blobPath = `invoices/${filename}`;

    const options: {
      access: "public";
      contentType?: string;
      token?: string;
    } = {
      access: "public",
      contentType: file.type || "application/octet-stream",
    };

    // Use BLOB_READ_WRITE_TOKEN when available (local dev / CI)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      options.token = process.env.BLOB_READ_WRITE_TOKEN;
    }

    const blob = await put(blobPath, file, options);

    return NextResponse.json(
      {
        url: blob.url,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[expenses/upload] Failed to upload invoice", err);

    const message =
      typeof err?.message === "string"
        ? err.message
        : "Failed to upload invoice file.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}


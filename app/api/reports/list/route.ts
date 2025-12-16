import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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

    const role = (session.user as any)?.role as string | undefined;

    if (!isAdminLike(role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only admins can list reports.",
        },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: "Store ID is required." },
        { status: 400 }
      );
    }

    const reportsDir = join(process.cwd(), "public", "location", storeId, "reports");

    if (!existsSync(reportsDir)) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Read all files in the reports directory
    const files = await readdir(reportsDir);
    const reportFiles = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const filepath = join(reportsDir, file);
        const stats = await stat(filepath);
        reportFiles.push({
          filename: file,
          url: `/location/${storeId}/reports/${file}`,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
        });
      }
    }

    // Sort by creation date (newest first)
    reportFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: reportFiles,
    });
  } catch (error) {
    console.error("Error listing reports:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list reports" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const request = await prisma.request.findUnique({
      where: { id },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!request) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...request,
        createdAt: request.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching request detail:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch request detail" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const body = await req.json();
    const { title, description, priority, assetId, attachments } = body ?? {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Title is required." },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json(
        { success: false, error: "Description is required." },
        { status: 400 }
      );
    }

    if (!assetId || typeof assetId !== "string" || !assetId.trim()) {
      return NextResponse.json(
        { success: false, error: "Asset is required." },
        { status: 400 }
      );
    }

    const existing = await prisma.request.findUnique({
      where: { id },
      select: { storeId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }

    // Ensure asset exists (optionally you could also enforce same store)
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { id: true },
    });

    if (!asset) {
      return NextResponse.json(
        { success: false, error: "Asset not found." },
        { status: 400 }
      );
    }

    const updated = await prisma.request.update({
      where: { id },
      data: {
        title: title.trim(),
        description: description.trim(),
        priority: priority || "Medium",
        assetId,
        attachments: Array.isArray(attachments) ? attachments : undefined,
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update request" },
      { status: 500 }
    );
  }
}


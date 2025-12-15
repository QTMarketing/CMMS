import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { nanoid } from "nanoid";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";

// GET: Get share link for a work order
// POST: Generate/regenerate share token
export async function GET(
  req: NextRequest,
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

    const role = (session.user as any)?.role as string | undefined;

    if (!isAdminLike(role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only admins can share work orders." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      select: { id: true, shareToken: true },
    });

    if (!workOrder) {
      return NextResponse.json(
        { success: false, error: "Work order not found" },
        { status: 404 }
      );
    }

    const shareUrl = workOrder.shareToken
      ? `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/share/workorder/${workOrder.shareToken}`
      : null;

    return NextResponse.json({
      success: true,
      data: {
        shareToken: workOrder.shareToken,
        shareUrl,
      },
    });
  } catch (error) {
    console.error("Error fetching share link:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch share link" },
      { status: 500 }
    );
  }
}

// POST: Generate or regenerate share token
export async function POST(
  req: NextRequest,
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

    const role = (session.user as any)?.role as string | undefined;

    if (!isAdminLike(role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only admins can generate share links." },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if work order exists
    const existing = await prisma.workOrder.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Work order not found" },
        { status: 404 }
      );
    }

    // Generate a new unique token
    const shareToken = nanoid(32);

    // Update work order with share token
    const updated = await prisma.workOrder.update({
      where: { id },
      data: { shareToken },
      select: { id: true, shareToken: true },
    });

    const shareUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/share/workorder/${shareToken}`;

    return NextResponse.json({
      success: true,
      data: {
        shareToken: updated.shareToken,
        shareUrl,
      },
    });
  } catch (error: any) {
    console.error("Error generating share token:", error);
    const errorMessage = error?.message || "Failed to generate share link";
    return NextResponse.json(
      { success: false, error: errorMessage, details: error?.code || "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}

// DELETE: Revoke share token
export async function DELETE(
  req: NextRequest,
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

    const role = (session.user as any)?.role as string | undefined;

    if (!isAdminLike(role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only admins can revoke share links." },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Remove share token
    await prisma.workOrder.update({
      where: { id },
      data: { shareToken: null },
    });

    return NextResponse.json({
      success: true,
      message: "Share link revoked successfully",
    });
  } catch (error) {
    console.error("Error revoking share token:", error);
    return NextResponse.json(
      { success: false, error: "Failed to revoke share link" },
      { status: 500 }
    );
  }
}

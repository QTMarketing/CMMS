import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find work order by share token
    const workOrder = await prisma.workOrder.findUnique({
      where: { shareToken: token },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            location: true,
            status: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
        notes: {
          orderBy: { timestamp: "desc" },
        },
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { success: false, error: "Work order not found or share link is invalid" },
        { status: 404 }
      );
    }

    // Return work order data (public view, no sensitive info)
    return NextResponse.json({
      success: true,
      data: workOrder,
    });
  } catch (error) {
    console.error("Error fetching shared work order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch work order" },
      { status: 500 }
    );
  }
}


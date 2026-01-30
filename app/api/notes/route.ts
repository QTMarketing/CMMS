import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET /api/notes?workOrderId=...
// (optional helper if you ever want to fetch notes from the API)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workOrderId = searchParams.get("workOrderId");

  try {
    const notes = await prisma.note.findMany({
      where: workOrderId ? { workOrderId } : {},
      orderBy: { timestamp: "asc" },
    });

    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/notes
// Body: { workOrderId: string; text: string; author?: string }
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { workOrderId, text, author } = body || {};

    if (!workOrderId || typeof workOrderId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid workOrderId." },
        { status: 400 }
      );
    }

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { success: false, error: "Note text is required." },
        { status: 400 }
      );
    }

    // Ensure the work order exists and user has access to it
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true, storeId: true, assignedToId: true },
    });

    if (!workOrder) {
      return NextResponse.json(
        { success: false, error: "Work order not found." },
        { status: 404 }
      );
    }

    // Check access: USER and TECHNICIAN can only comment on work orders they have access to
    const role = (session.user as any)?.role as string | undefined;
    const userStoreId = ((session.user as any)?.storeId ?? null) as string | null;
    const vendorId = ((session.user as any)?.vendorId ?? null) as string | null;

    if (role === "USER" || role === "VENDOR") {
      // USER: can only comment on work orders from their store
      if (role === "USER" && workOrder.storeId !== userStoreId) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 }
        );
      }
      // VENDOR: can only comment on work orders assigned to them
      if (role === "VENDOR" && workOrder.assignedToId !== vendorId) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    // Create the note
    const note = await prisma.note.create({
      data: {
        workOrderId,
        text: text.trim(),
        author: author || "System",
        // timestamp will use default(now()) in Prisma schema
      },
    });

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

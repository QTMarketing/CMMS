import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type WorkOrderStatus = "Open" | "In Progress" | "Completed" | "Cancelled";
type RouteContext = { params: Promise<{ id: string }> };

const validTransitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  Open: ["In Progress", "Completed", "Cancelled"],
  "In Progress": ["Completed", "Cancelled", "Open"],
  Completed: ["In Progress", "Open"], // allow reversing
  Cancelled: ["Open"],
};

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  try {
    const body = await req.json();

    // Pick up all editable fields
    const nextStatus = body.status as WorkOrderStatus | undefined;
    const priority = body.priority as string | undefined;
    const description = body.description as string | undefined;
    // Accept either key from client
    const assignedToRaw: string | undefined = body.assignedTo ?? body.technicianId;

    // Load current work order to validate status transitions
    const current = await prisma.workOrder.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 });
    }
    // Validate transition
    if (
      nextStatus &&
      nextStatus !== current.status &&
      !validTransitions[current.status as WorkOrderStatus]?.includes(nextStatus)
    ) {
      return NextResponse.json(
        {
          error: `Invalid transition from ${current.status} to ${nextStatus}`,
        },
        { status: 400 }
      );
    }
    // Build update object with allowed fields only
    const data: any = {};
    if (nextStatus) data.status = nextStatus;
    if (priority !== undefined) data.priority = priority;
    if (description !== undefined) data.description = description;
    // Technician relation (connect/disconnect)
    if (assignedToRaw !== undefined) {
      data.assignedTo = assignedToRaw === "" ? { disconnect: true } : { connect: { id: assignedToRaw } };
    }
    const updated = await prisma.workOrder.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Unknown error" },
      { status: 500 }
    );
  }
}

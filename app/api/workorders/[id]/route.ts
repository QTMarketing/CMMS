import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["Open", "In Progress", "Completed", "Cancelled"] as const;
type Status = (typeof VALID_STATUSES)[number];

const VALID_TRANSITIONS: Record<Status, Status[]> = {
  Open: ["In Progress", "Completed", "Cancelled"],
  "In Progress": ["Open", "Completed", "Cancelled"],
  Completed: ["Open", "In Progress"],
  Cancelled: ["Open"],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const body = await req.json();

  // 1. Fetch existing work order
  const existing = await prisma.workOrder.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Work order not found" }, { status: 404 });
  }

  const currentStatus = existing.status as Status;

  // 2. Determine next status (or keep current)
  const nextStatus = (body.status ?? existing.status) as Status;

  if (!VALID_STATUSES.includes(nextStatus)) {
    return NextResponse.json(
      { error: "Invalid status value" },
      { status: 400 }
    );
  }

  // 3. Enforce valid transitions
  const allowedNext = VALID_TRANSITIONS[currentStatus] ?? [];
  if (nextStatus !== currentStatus && !allowedNext.includes(nextStatus)) {
    return NextResponse.json(
      { error: `Invalid status transition from ${currentStatus} to ${nextStatus}` },
      { status: 400 }
    );
  }

  // 4. Compute completedAt based on status transition
  let completedAt = existing.completedAt;

  const wasCompleted = currentStatus === "Completed";
  const willBeCompleted = nextStatus === "Completed";

  if (!wasCompleted && willBeCompleted) {
    // Moving INTO Completed
    completedAt = new Date();
  } else if (wasCompleted && !willBeCompleted) {
    // Moving OUT OF Completed (re-open / change)
    completedAt = null;
  }

  // 5. Build update data for other fields
  const data: any = {
    status: nextStatus,
    completedAt,
  };

  if (body.priority !== undefined) {
    data.priority = body.priority;
  }

  if (body.description !== undefined) {
    data.description = body.description;
  }

  if ("assignedToId" in body) {
    // allow null to unassign
    data.assignedToId = body.assignedToId ?? null;
  }

  const updated = await prisma.workOrder.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

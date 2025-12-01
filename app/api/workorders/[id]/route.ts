import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike, isTechnician as isTechnicianRole } from "@/lib/roles";
import { sendWorkOrderAssignedEmail } from "@/lib/email";

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
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const sessionUser = session.user as any;
  const sessionRole = sessionUser?.role as string | undefined;
  const sessionTechnicianId = (sessionUser?.technicianId ?? null) as
    | string
    | null;
  const sessionStoreId = (sessionUser?.storeId ?? null) as string | null;

  const { id } = await params;
  const body = await req.json();

  // 1. Fetch existing work order
  const existing = await prisma.workOrder.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Work order not found" },
      { status: 404 }
    );
  }

  // Only admins or the technician assigned to this work order (within their store)
  // may update it.
  const isAdmin = isAdminLike(sessionRole);
  const isAssignedTechnician =
    isTechnicianRole(sessionRole) &&
    !!sessionTechnicianId &&
    existing.assignedToId === sessionTechnicianId &&
    (!!existing.storeId ? existing.storeId === sessionStoreId : false);

  if (!isAdmin && !isAssignedTechnician) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
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
  // Only admins may change priority / description / assignment / due date. Technicians
  // are limited to status transitions on their own work orders.
  if (isAdmin) {
    if (body.priority !== undefined) {
      data.priority = body.priority;
    }

    if (body.description !== undefined) {
      data.description = body.description;
    }

    if (Object.prototype.hasOwnProperty.call(body, "dueDate")) {
      const rawDueDate = body.dueDate;
      if (rawDueDate === null || rawDueDate === "") {
        data.dueDate = null;
      } else if (typeof rawDueDate === "string") {
        const trimmed = rawDueDate.trim();
        if (trimmed.length === 0) {
          data.dueDate = null;
        } else {
          const iso = `${trimmed}T12:00:00.000Z`;
          const ms = Date.parse(iso);
          if (Number.isNaN(ms)) {
            return NextResponse.json(
              { error: "Invalid due date." },
              { status: 400 }
            );
          }
          data.dueDate = new Date(ms);
        }
      }
    }

    const hasAssignedToIdKey = Object.prototype.hasOwnProperty.call(
      body,
      "assignedToId"
    );
    const hasAssignedToKey = Object.prototype.hasOwnProperty.call(
      body,
      "assignedTo"
    );

    if (hasAssignedToIdKey || hasAssignedToKey) {
      const nextAssignedToId =
        (hasAssignedToIdKey ? body.assignedToId : body.assignedTo) ?? null;

      // allow null to unassign
      data.assignedToId =
        typeof nextAssignedToId === "string" && nextAssignedToId.length > 0
          ? nextAssignedToId
          : null;
    }
  }

  const previousTechnicianId = existing.assignedToId;

  const updated = await prisma.workOrder.update({
    where: { id },
    data,
  });

  const newTechnicianId = updated.assignedToId;
  const technicianChanged =
    !!newTechnicianId && newTechnicianId !== previousTechnicianId;

  if (technicianChanged && newTechnicianId) {
    try {
      const detailed = await prisma.workOrder.findUnique({
        where: { id: updated.id },
        include: {
          assignedTo: {
            select: {
              email: true,
              name: true,
              store: {
                select: {
                  name: true,
                },
              },
            },
          },
          store: {
            select: {
              name: true,
            },
          },
        },
      });

      const technician = detailed?.assignedTo;

      if (technician?.email) {
        const dueDateString = detailed?.dueDate
          ? detailed.dueDate.toLocaleString()
          : undefined;

        await sendWorkOrderAssignedEmail({
          technicianEmail: technician.email,
          technicianName: technician.name || undefined,
          workOrderId: updated.id,
          storeName:
            technician.store?.name || detailed?.store?.name || undefined,
          title: detailed?.title,
          description: detailed?.description || undefined,
          dueDate: dueDateString,
        });
      }
    } catch (error) {
      console.error(
        "[workorders] Failed to send work order assignment email on update",
        error
      );
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.workOrder.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Work order not found" },
        { status: 404 }
      );
    }

    await prisma.workOrder.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[workorders] Failed to delete work order", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete work order" },
      { status: 500 }
    );
  }
}

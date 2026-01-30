import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike, isTechnician as isTechnicianRole } from "@/lib/roles";
import {
  sendEmail,
  sendWorkOrderAssignedEmail,
  sendWorkOrderUpdateEmail,
} from "@/lib/email";

const VALID_STATUSES = ["Open", "In Progress", "Pending Review", "Completed", "Cancelled"] as const;
type Status = (typeof VALID_STATUSES)[number];

// Status transitions:
// - Technicians can only go: In Progress -> Pending Review
// - Admins can go: Pending Review -> Completed (approve) or Pending Review -> In Progress (reject/needs changes)
// - Admins can also do all other transitions
const VALID_TRANSITIONS: Record<Status, Status[]> = {
  Open: ["In Progress", "Completed", "Cancelled"],
  "In Progress": ["Open", "Pending Review", "Completed", "Cancelled"],
  "Pending Review": ["In Progress", "Completed", "Cancelled"], // Only admins can transition from here
  Completed: ["Open", "In Progress", "Pending Review"],
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

  // 3. Enforce valid transitions and role-based restrictions
  const allowedNext = VALID_TRANSITIONS[currentStatus] ?? [];
  if (nextStatus !== currentStatus && !allowedNext.includes(nextStatus)) {
    return NextResponse.json(
      { error: `Invalid status transition from ${currentStatus} to ${nextStatus}` },
      { status: 400 }
    );
  }

  // 4. Enforce role-based restrictions:
  // - Technicians can only submit for review (In Progress -> Pending Review)
  // - Technicians CANNOT directly complete work orders
  // - Only admins can approve/reject pending reviews
  if (!isAdmin) {
    // Technician restrictions
    if (nextStatus === "Completed" && currentStatus !== "Completed") {
      return NextResponse.json(
        { error: "Technicians cannot mark work orders as completed. Please submit for review instead." },
        { status: 403 }
      );
    }
    if (currentStatus === "Pending Review" && nextStatus !== currentStatus) {
      return NextResponse.json(
        { error: "Only administrators can review and approve/reject pending work orders." },
        { status: 403 }
      );
    }
    // Technicians can only go from "In Progress" to "Pending Review"
    if (currentStatus === "In Progress" && nextStatus === "Pending Review") {
      // This is allowed - technician submitting for review
    } else if (currentStatus !== "In Progress" && nextStatus === "Pending Review") {
      return NextResponse.json(
        { error: "Work orders can only be submitted for review when status is 'In Progress'." },
        { status: 400 }
      );
    }
  }

  // 5. Compute completedAt based on status transition
  // Only set completedAt when admin approves (Pending Review -> Completed)
  let completedAt = existing.completedAt;

  const wasCompleted = currentStatus === "Completed";
  const willBeCompleted = nextStatus === "Completed";

  if (!wasCompleted && willBeCompleted) {
    // Moving INTO Completed (admin approval)
    completedAt = new Date();
  } else if (wasCompleted && !willBeCompleted) {
    // Moving OUT OF Completed (re-open / change)
    completedAt = null;
  }
  // Note: Pending Review status does NOT set completedAt - only Completed does

  // 5. Build update data for other fields
  const data: any = {
    status: nextStatus,
    completedAt,
  };
  // Technicians and admins can add attachments
  if (Object.prototype.hasOwnProperty.call(body, "attachments")) {
    if (Array.isArray(body.attachments)) {
      data.attachments = body.attachments;
    }
  }

  // Only admins can add invoices
  if (isAdmin && Object.prototype.hasOwnProperty.call(body, "invoices")) {
    if (Array.isArray(body.invoices)) {
      data.invoices = body.invoices;
    }
  }

  // Only admins may change priority / description / assignment / due date. Technicians
  // are limited to status transitions and attachments on their own work orders.
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
  const previousStatus = existing.status;

  const updated = await prisma.workOrder.update({
    where: { id },
    data,
  });

  const newTechnicianId = updated.assignedToId;
  const technicianChanged =
    !!newTechnicianId && newTechnicianId !== previousTechnicianId;
  const statusChanged = updated.status !== previousStatus;

  // Notify technician if assigned
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
          createdBy: {
            select: {
              email: true,
              role: true,
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

  // Notify user (creator) if work order is updated (status change, assignment, etc.)
  if (updated.createdById && (statusChanged || technicianChanged || isAdmin)) {
    try {
      const detailed = await prisma.workOrder.findUnique({
        where: { id: updated.id },
        include: {
          createdBy: {
            select: {
              email: true,
              role: true,
            },
          },
          assignedTo: {
            select: {
              name: true,
            },
          },
        },
      });

      const creator = detailed?.createdBy;
      // Only notify if creator is a USER (not admin/technician)
      if (creator?.email && creator.role === "USER") {
        let updateMessage = "";
        if (statusChanged) {
          updateMessage = `Status changed to ${updated.status}`;
        }
        if (technicianChanged && detailed?.assignedTo) {
          updateMessage += updateMessage
            ? `. Assigned to ${detailed.assignedTo.name}`
            : `Assigned to ${detailed.assignedTo.name}`;
        }
        if (isAdmin && !statusChanged && !technicianChanged) {
          updateMessage = "Work order has been updated";
        }

        await sendWorkOrderUpdateEmail({
          userEmail: creator.email,
          workOrderId: updated.id,
          workOrderTitle: updated.title,
          updateMessage: updateMessage || "Work order has been updated",
          status: updated.status,
        });
      }
    } catch (error) {
      console.error(
        "[workorders] Failed to send work order update email to user",
        error
      );
    }
  }

  // Return the updated work order with all relations
  const updatedWithRelations = await prisma.workOrder.findUnique({
    where: { id: updated.id },
    include: {
      asset: true,
      assignedTo: true,
      notes: true,
      createdBy: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  });

  // Notify admins when a work order is completed or otherwise updated
  if (statusChanged || technicianChanged) {
    try {
      const storeId = updated.storeId;
      const admins = await prisma.user.findMany({
        where: {
          OR: [
            { role: "MASTER_ADMIN" },
            ...(storeId
              ? [{ role: { in: ["STORE_ADMIN", "ADMIN"] }, storeId }]
              : []),
          ],
        },
        select: { email: true },
      });

      if (admins.length) {
        const subject = statusChanged
          ? `Work Order Status Updated (#${updated.id})`
          : `Work Order Updated (#${updated.id})`;

        let body = `<p>Work order <strong>#${updated.id}</strong> has been updated.</p>`;
        body += `<p><strong>Title:</strong> ${updated.title}</p>`;
        if (statusChanged) {
          body += `<p><strong>Status:</strong> ${updated.status}</p>`;
        }
        if (technicianChanged && updated.assignedToId) {
          body += `<p><strong>Assigned To:</strong> ${updated.assignedToId}</p>`;
        }

        await sendEmail({
          to: admins.map((a) => a.email).filter(Boolean),
          subject,
          html: body,
        });
      }
    } catch (error) {
      console.error(
        "[workorders PATCH] Failed to send admin notification email on update",
        error
      );
    }
  }

  return NextResponse.json({ success: true, data: updatedWithRelations });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;
    const role = sessionUser?.role as string | undefined;
    const userStoreId = (sessionUser?.storeId ?? null) as string | null;

    if (!session || !isAdminLike(role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

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

    // Optional safety: ensure store-scoped admins cannot delete work orders
    // outside their store. MASTER_ADMIN (canSeeAllStores) is unrestricted.
    if (role === "STORE_ADMIN" && existing.storeId && existing.storeId !== userStoreId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
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

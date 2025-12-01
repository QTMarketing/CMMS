import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { nanoid } from "nanoid";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  isAdminLike,
  isTechnician as isTechnicianRole,
  isMasterAdmin,
} from "@/lib/roles";
import { canSeeAllStores, getScopedStoreId } from "@/lib/storeAccess";
import { sendWorkOrderAssignedEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const role = (session.user as any)?.role as string | undefined;
  const technicianId = ((session.user as any)?.technicianId ?? null) as
    | string
    | null;
  const userStoreId = ((session.user as any)?.storeId ?? null) as
    | string
    | null;

  const searchParams = req.nextUrl.searchParams;
  const urlStoreId = searchParams.get("storeId") || null;
  const rawFrom = searchParams.get("from");
  const rawTo = searchParams.get("to");

  const where: any = {};

  if (canSeeAllStores(role)) {
    if (urlStoreId) {
      where.storeId = urlStoreId;
    }
  } else {
    const scopedStoreId = getScopedStoreId(role, userStoreId);
    if (scopedStoreId) {
      where.storeId = scopedStoreId;
    } else {
      where.storeId = "__never_match__";
    }
  }

  if (isTechnicianRole(role)) {
    // Technicians must only ever see their own assigned work orders.
    // If, for some reason, their user account is not linked to a technician
    // record, they should see nothing rather than all store work orders.
    if (!technicianId) {
      where.assignedToId = "__never_match__";
    } else {
      where.assignedToId = technicianId;
    }
  }

  // Optional dueDate range filter (from/to). We treat incoming values as
  // date-only when possible (YYYY-MM-DD) and normalize them to a UTC
  // start-of-day / end-of-day range so they line up with how due dates are stored.
  const parseBoundary = (value: string | null, type: "start" | "end") => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    // If the client sent a full ISO string, use it as-is.
    if (trimmed.includes("T")) {
      const d = new Date(trimmed);
      return Number.isNaN(d.getTime()) ? undefined : d;
    }

    const suffix =
      type === "start" ? "T00:00:00.000Z" : "T23:59:59.999Z";
    const d = new Date(`${trimmed}${suffix}`);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };

  const fromDate = parseBoundary(rawFrom, "start");
  const toDate = parseBoundary(rawTo, "end");

  if (fromDate || toDate) {
    where.dueDate = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };
  }

  const result = await prisma.workOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      notes: true,
    },
  });
  return NextResponse.json({ success: true, data: result });
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const role = (session.user as any)?.role as string | undefined;
    const userStoreId = ((session.user as any)?.storeId ?? null) as
      | string
      | null;

    // Only admin-like roles may create work orders; TECHNICIAN explicitly forbidden.
    if (!isAdminLike(role) || isTechnicianRole(role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      assetId,
      priority,
      assignedTo,
      dueDate,
      description,
      storeId: rawStoreId,
    } = body ?? {};

    if (!title || !assetId || !priority) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 }
      );
    }
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return NextResponse.json(
        { success: false, error: "Asset not found." },
        { status: 400 }
      );
    }
    if (assignedTo) {
      const tech = await prisma.technician.findUnique({
        where: { id: assignedTo },
      });
      if (!tech) {
        return NextResponse.json(
          { success: false, error: "Technician not found." },
          { status: 400 }
        );
      }
    }
    if (!["Low", "Medium", "High"].includes(priority)) {
      return NextResponse.json(
        { success: false, error: "Invalid priority." },
        { status: 400 }
      );
    }

    // Determine final storeId for the work order.
    const bodyStoreId =
      typeof rawStoreId === "string" && rawStoreId.trim().length > 0
        ? rawStoreId.trim()
        : null;

    let finalStoreId: string | null = null;

    if (isMasterAdmin(role)) {
      // MASTER_ADMIN must explicitly choose a store when creating a work order.
      if (!bodyStoreId) {
        return NextResponse.json(
          { success: false, error: "storeId is required for work orders." },
          { status: 400 }
        );
      }
      finalStoreId = bodyStoreId;
    } else {
      // STORE_ADMIN: always use their own storeId, ignoring any body storeId.
      finalStoreId = userStoreId;
      if (!finalStoreId) {
        return NextResponse.json(
          {
            success: false,
            error: "Your user account is not associated with a store.",
          },
          { status: 400 }
        );
      }
    }

    // Optional safety: if the asset has a storeId, ensure it matches the
    // chosen storeId so we don't cross-link stores and assets.
    if (asset.storeId && asset.storeId !== finalStoreId) {
      return NextResponse.json(
        {
          success: false,
          error: "Selected asset does not belong to the chosen store.",
        },
        { status: 400 }
      );
    }

    // Normalize dueDate: expect "YYYY-MM-DD" string from the client and
    // convert it to a Date at noon UTC to avoid off-by-one issues.
    let normalizedDueDate: Date | undefined;
    if (typeof dueDate === "string" && dueDate.trim().length > 0) {
      const iso = `${dueDate.trim()}T12:00:00.000Z`;
      const ms = Date.parse(iso);
      if (Number.isNaN(ms)) {
        return NextResponse.json(
          { success: false, error: "Invalid due date." },
          { status: 400 }
        );
      }
      normalizedDueDate = new Date(ms);
    }

    const newWorkOrder = await prisma.workOrder.create({
      data: {
        id: nanoid(),
        title,
        assetId,
        priority,
        status: "Open",
        assignedToId: assignedTo || undefined,
        createdAt: new Date(),
        dueDate: normalizedDueDate,
        description: description || undefined,
        storeId: finalStoreId,
      },
    });

    if (newWorkOrder.assignedToId) {
      try {
        const technician = await prisma.technician.findUnique({
          where: { id: newWorkOrder.assignedToId },
          select: {
            email: true,
            name: true,
            store: {
              select: {
                name: true,
              },
            },
          },
        });

        if (technician?.email) {
          const store =
            newWorkOrder.storeId &&
            (await prisma.store.findUnique({
              where: { id: newWorkOrder.storeId },
              select: { name: true },
            }));

          const dueDateString = newWorkOrder.dueDate
            ? newWorkOrder.dueDate.toLocaleString()
            : undefined;

          await sendWorkOrderAssignedEmail({
            technicianEmail: technician.email,
            technicianName: technician.name || undefined,
            workOrderId: newWorkOrder.id,
            storeName:
              technician.store?.name || store?.name || undefined,
            title: newWorkOrder.title,
            description: newWorkOrder.description || undefined,
            dueDate: dueDateString,
          });
        }
      } catch (error) {
        console.error(
          "[workorders] Failed to send work order assignment email on create",
          error
        );
      }
    }

    return NextResponse.json(
      { success: true, data: newWorkOrder },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}

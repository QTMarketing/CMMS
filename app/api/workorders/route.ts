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

  const urlStoreId = req.nextUrl.searchParams.get("storeId") || null;

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
    if (dueDate && isNaN(Date.parse(dueDate))) {
      return NextResponse.json(
        { success: false, error: "Invalid due date." },
        { status: 400 }
      );
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

    const newWorkOrder = await prisma.workOrder.create({
      data: {
        id: nanoid(),
        title,
        assetId,
        priority,
        status: "Open",
        assignedToId: assignedTo || undefined,
        createdAt: new Date(),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        description: description || undefined,
        storeId: finalStoreId,
      },
    });
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

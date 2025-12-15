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
import { verifyMobileToken } from "@/lib/mobileAuth";

export async function GET(req: NextRequest) {
  try {
    // Try NextAuth session first (for web)
    let session = await getServerSession(authOptions);
    let role: string | undefined;
    let technicianId: string | null = null;
    let userStoreId: string | null = null;

    // If no session, try mobile token
    if (!session) {
      const mobileUser = verifyMobileToken(req);
      if (mobileUser) {
        role = mobileUser.role;
        userStoreId = mobileUser.storeId || null;
      } else {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
    } else {
      role = (session.user as any)?.role as string | undefined;
      technicianId = ((session.user as any)?.technicianId ?? null) as
        | string
        | null;
      userStoreId = ((session.user as any)?.storeId ?? null) as
        | string
        | null;
    }

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
        createdBy: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("Error fetching work orders:", err);
    // Fail soft with empty list so UI can still render
    return NextResponse.json(
      { success: true, data: [] },
      { status: 200 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Try NextAuth session first (for web)
    let session = await getServerSession(authOptions);
    let role: string | undefined;
    let userStoreId: string | null = null;
    let userId: string | undefined;

    // If no session, try mobile token
    if (!session) {
      const req = new NextRequest(request.url, {
        headers: request.headers,
      });
      const mobileUser = verifyMobileToken(req);
      if (mobileUser) {
        role = mobileUser.role;
        userStoreId = mobileUser.storeId || null;
        userId = mobileUser.id;
      } else {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
    } else {
      role = (session.user as any)?.role as string | undefined;
      userStoreId = ((session.user as any)?.storeId ?? null) as
        | string
        | null;
      userId = (session.user as any)?.id as string | undefined;
    }

    // Only admin-like roles and USER may create work orders; TECHNICIAN explicitly forbidden.
    const canCreate = isAdminLike(role) || role === "USER";
    if (!canCreate || isTechnicianRole(role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log("[workorders POST] Received request body:", JSON.stringify(body, null, 2));
    const {
      title,
      location,
      assetId,
      partsRequired,
      problemDescription,
      helpDescription,
      attachments,
      priority,
      assignedTo,
      dueDate,
      description,
      storeId: rawStoreId,
    } = body ?? {};

    // Validate required fields
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Title is required." },
        { status: 400 }
      );
    }
    if (!location || typeof location !== "string" || !location.trim()) {
      return NextResponse.json(
        { success: false, error: "Location is required." },
        { status: 400 }
      );
    }
    if (!assetId || typeof assetId !== "string") {
      return NextResponse.json(
        { success: false, error: "Asset is required." },
        { status: 400 }
      );
    }
    if (!priority || typeof priority !== "string") {
      return NextResponse.json(
        { success: false, error: "Priority is required." },
        { status: 400 }
      );
    }
    if (!problemDescription || typeof problemDescription !== "string" || !problemDescription.trim()) {
      return NextResponse.json(
        { success: false, error: "Where or What is the problem? is required." },
        { status: 400 }
      );
    }
    if (!helpDescription || typeof helpDescription !== "string" || !helpDescription.trim()) {
      return NextResponse.json(
        { success: false, error: "How can we help? is required." },
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
    } else if (role === "USER") {
      // USER: always use their own storeId, ignoring any body storeId.
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

    // userId is already set above from session or mobile token

    const newWorkOrder = await prisma.workOrder.create({
      data: {
        id: nanoid(),
        title,
        location: location || undefined,
        assetId,
        partsRequired: partsRequired === true,
        problemDescription: problemDescription || undefined,
        helpDescription: helpDescription || undefined,
        attachments: Array.isArray(attachments) ? attachments : [],
        priority,
        status: "Open",
        assignedToId: assignedTo || undefined,
        createdAt: new Date(),
        dueDate: normalizedDueDate,
        description: description || undefined,
        storeId: finalStoreId,
        createdById: userId || undefined,
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
    console.error("[workorders POST] Error creating work order:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    const errorDetails = e instanceof Error ? e.stack : String(e);
    console.error("[workorders POST] Error details:", errorDetails);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to create work order: ${errorMessage}`,
        details: process.env.NODE_ENV === "development" ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}

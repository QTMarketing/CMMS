import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";
import { canSeeAllStores, getScopedStoreId } from "@/lib/storeAccess";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const rawRole = (session.user as any)?.role as string | undefined;
    const role = rawRole?.toUpperCase();
    const userStoreId = ((session.user as any)?.storeId ?? null) as
      | string
      | null;
    const technicianVendorId = ((session.user as any)?.vendorId ?? null) as
      | string
      | null;

    const searchParams = req.nextUrl.searchParams;
    const urlStoreId = searchParams.get("storeId") || null;
    const workOrderId = searchParams.get("workOrderId") || null;
    const category = searchParams.get("category") || null;
    const from = searchParams.get("from") || null;
    const to = searchParams.get("to") || null;

    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const page = Math.max(1, Number.parseInt(pageParam || "1", 10) || 1);
    const limit = Math.max(
      1,
      Math.min(100, Number.parseInt(limitParam || "20", 10) || 20)
    );
    const skip = (page - 1) * limit;

    // --- Technician view: own work order only ---
    if (role === "TECHNICIAN") {
      if (!workOrderId) {
        return NextResponse.json(
          {
            success: false,
            error: "Technicians can only view expenses for a specific work order.",
          },
          { status: 403 }
        );
      }

      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
        select: {
          assignedToId: true,
          storeId: true,
        },
      });

      if (!workOrder) {
        return NextResponse.json(
          { success: false, error: "Work order not found." },
          { status: 404 }
        );
      }

      if (!technicianVendorId || workOrder.assignedToId !== technicianVendorId) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 }
        );
      }

      if (
        workOrder.storeId &&
        userStoreId &&
        workOrder.storeId !== userStoreId
      ) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 }
        );
      }

      const where: any = { workOrderId };

      if (category) {
        where.category = category;
      }

      if (from || to) {
        where.createdAt = {};
        if (from) {
          const fromDate = new Date(from);
          if (!Number.isNaN(fromDate.getTime())) {
            (where.createdAt as any).gte = fromDate;
          }
        }
        if (to) {
          const toDate = new Date(to);
          if (!Number.isNaN(toDate.getTime())) {
            (where.createdAt as any).lte = toDate;
          }
        }
      }

      const [total, expenses] = await Promise.all([
        prisma.expense.count({ where }),
        prisma.expense.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            store: {
              select: {
                id: true,
                name: true,
              },
            },
            part: {
              select: {
                id: true,
                name: true,
                partNumber: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                email: true,
              },
            },
            workOrder: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: expenses,
        page,
        limit,
        total,
      });
    }

    // --- Admin-like view ---
    if (!isAdminLike(role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const isMaster = role === "MASTER_ADMIN";
    const isAdminRole = role === "ADMIN";
    const isStoreAdminRole = role === "STORE_ADMIN";

    const where: any = {};

    // Store scoping: MASTER_ADMIN and ADMIN can filter any store.
    // STORE_ADMIN is restricted to their own store.
    if (isMaster || isAdminRole) {
      if (urlStoreId) {
        where.storeId = urlStoreId;
      }
    } else if (isStoreAdminRole) {
      const scopedStoreId = getScopedStoreId(role, userStoreId);
      where.storeId = scopedStoreId ?? "__never_match__";
    } else {
      where.storeId = "__never_match__";
    }

    if (workOrderId) {
      where.workOrderId = workOrderId;
    }

    if (category) {
      where.category = category;
    }

    // Date range filter (createdAt)
    if (from || to) {
      where.createdAt = {};
      if (from) {
        const fromDate = new Date(from);
        if (!Number.isNaN(fromDate.getTime())) {
          (where.createdAt as any).gte = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (!Number.isNaN(toDate.getTime())) {
          (where.createdAt as any).lte = toDate;
        }
      }
    }

    const [total, expenses] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          part: {
            select: {
              id: true,
              name: true,
              partNumber: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              email: true,
            },
          },
          workOrder: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: expenses,
      page,
      limit,
      total,
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const rawRole = (session.user as any)?.role as string | undefined;
    const role = rawRole?.toUpperCase();
    const userStoreId = ((session.user as any)?.storeId ?? null) as
      | string
      | null;
    const userId = (session.user as any)?.id as string | undefined;

    if (!isAdminLike(role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      workOrderId,
      storeId: rawStoreId,
      partId,
      description,
      amount,
      category,
      invoiceUrl,
      invoiceType,
      createdById: _createdById, // from body, but we will validate against session
    } = body ?? {};

    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json(
        { success: false, error: "Description is required." },
        { status: 400 }
      );
    }

    if (
      amount === null ||
      amount === undefined ||
      (typeof amount !== "number" && typeof amount !== "string")
    ) {
      return NextResponse.json(
        { success: false, error: "Amount is required." },
        { status: 400 }
      );
    }

    const numericAmount =
      typeof amount === "number"
        ? amount
        : Number.parseFloat(String(amount).trim());

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Amount must be a positive number greater than 0.",
        },
        { status: 400 }
      );
    }

    // Determine storeId
    let finalStoreId: string | null = null;

    if (!rawStoreId || typeof rawStoreId !== "string") {
      return NextResponse.json(
        { success: false, error: "storeId is required for expenses." },
        { status: 400 }
      );
    }

    finalStoreId = rawStoreId.trim();

    if (!finalStoreId) {
      return NextResponse.json(
        {
          success: false,
          error: "Your user account is not associated with a store.",
        },
        { status: 400 }
      );
    }

    // Validate store exists
    const store = await prisma.store.findUnique({
      where: { id: finalStoreId },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Invalid store selected." },
        { status: 400 }
      );
    }

    const isStoreAdminRole = role === "STORE_ADMIN";
    if (isStoreAdminRole && userStoreId && store.id !== userStoreId) {
      return NextResponse.json(
        {
          success: false,
          error: "Managers can only create expenses for their own store.",
        },
        { status: 403 }
      );
    }

    // If workOrderId is provided, ensure it belongs to the same store
    if (workOrderId && typeof workOrderId === "string") {
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
        select: { storeId: true },
      });

      if (!workOrder) {
        return NextResponse.json(
          { success: false, error: "Work order not found." },
          { status: 404 }
        );
      }

      if (workOrder.storeId && workOrder.storeId !== finalStoreId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Work order does not belong to the same store as this expense.",
          },
          { status: 400 }
        );
      }
    }

    // Validate part/store consistency if partId is provided
    if (partId && typeof partId === "string") {
      const part = await prisma.inventoryItem.findUnique({
        where: { id: partId },
        select: { storeId: true },
      });

      if (!part) {
        return NextResponse.json(
          { success: false, error: "Part not found." },
          { status: 404 }
        );
      }

      if (part.storeId && part.storeId !== finalStoreId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Selected part does not belong to the same store as this expense.",
          },
          { status: 400 }
        );
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Invalid user session." },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        id: crypto.randomUUID(),
        workOrderId: typeof workOrderId === "string" ? workOrderId : null,
        storeId: finalStoreId,
        partId: typeof partId === "string" ? partId : null,
        description: description.trim(),
        amount: numericAmount,
        category: typeof category === "string" ? category.trim() || null : null,
        invoiceUrl:
          typeof invoiceUrl === "string" && invoiceUrl.trim().length > 0
            ? invoiceUrl.trim()
            : null,
        invoiceType:
          typeof invoiceType === "string" && invoiceType.trim().length > 0
            ? invoiceType.trim()
            : null,
        uploadedAt: invoiceUrl ? new Date() : null,
        createdById: userId,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        part: {
          select: {
            id: true,
            name: true,
            partNumber: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
        workOrder: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json(
      { success: true, data: expense },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create expense" },
      { status: 500 }
    );
  }
}


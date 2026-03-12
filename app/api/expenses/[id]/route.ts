import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { del } from "@vercel/blob";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const rawRole = (session.user as any)?.role as string | undefined;
    const role = rawRole?.toUpperCase();
    const userId = (session.user as any)?.id as string | undefined;

    const existing = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Expense not found." },
        { status: 404 }
      );
    }

    const isMaster = role === "MASTER_ADMIN";
    const isAdminRole = role === "ADMIN";
    const isStoreAdminRole = role === "STORE_ADMIN";
    const isCreator = userId && existing.createdById === userId;

    const canEdit =
      isMaster || isAdminRole || (isStoreAdminRole && isCreator);

    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      description,
      amount,
      category,
      invoiceUrl,
      invoiceType,
    } = body ?? {};

    const data: any = {};

    if (description !== undefined) {
      if (
        typeof description !== "string" ||
        !description.trim()
      ) {
        return NextResponse.json(
          { success: false, error: "Description cannot be empty." },
          { status: 400 }
        );
      }
      data.description = description.trim();
    }

    if (amount !== undefined) {
      if (
        amount === null ||
        (typeof amount !== "number" && typeof amount !== "string")
      ) {
        return NextResponse.json(
          { success: false, error: "Amount must be a number." },
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
      data.amount = numericAmount;
    }

    if (category !== undefined) {
      if (category === null) {
        data.category = null;
      } else if (typeof category === "string") {
        data.category = category.trim() || null;
      }
    }

    if (invoiceUrl !== undefined) {
      if (invoiceUrl === null || invoiceUrl === "") {
        data.invoiceUrl = null;
        data.invoiceType = null;
        data.uploadedAt = null;
      } else if (typeof invoiceUrl === "string") {
        data.invoiceUrl = invoiceUrl.trim();
        data.uploadedAt = new Date();
      }
    }

    if (invoiceType !== undefined) {
      if (invoiceType === null || invoiceType === "") {
        data.invoiceType = null;
      } else if (typeof invoiceType === "string") {
        data.invoiceType = invoiceType.trim();
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields provided for update." },
        { status: 400 }
      );
    }

    const updated = await prisma.expense.update({
      where: { id },
      data,
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
      { success: true, data: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update expense" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const role = (session.user as any)?.role as string | undefined;

    // Only MASTER_ADMIN or ADMIN may delete expenses
    const isMasterAdmin = role === "MASTER_ADMIN";
    const isAdmin = role === "ADMIN";

    if (!isMasterAdmin && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const existing = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Expense not found." },
        { status: 404 }
      );
    }

    // If there is an invoiceUrl, delete the underlying blob
    if (existing.invoiceUrl) {
      try {
        await del(existing.invoiceUrl);
      } catch (err) {
        // Log but do not block deletion of DB record
        console.error(
          "[expenses DELETE] Failed to delete invoice blob:",
          err
        );
      }
    }

    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}


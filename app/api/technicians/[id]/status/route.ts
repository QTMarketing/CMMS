import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

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

  const user = session.user as any;
  const role = user?.role;
  const vendorId = user?.vendorId;

  // Only vendors can update their own status
  if (role !== "VENDOR") {
    return NextResponse.json(
      { success: false, error: "Only vendors can update their status" },
      { status: 403 }
    );
  }

  const { id } = await params;

  // Vendors can only update their own status
  if (id !== vendorId) {
    return NextResponse.json(
      { success: false, error: "You can only update your own status" },
      { status: 403 }
    );
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body. Expected JSON.",
        },
        { status: 400 }
      );
    }

    const { status } = body || {};

    // Validate status value
    const validStatuses = ["offline", "online", "work_assigned"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Status must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Check if vendor exists first
    const existingVendor = await prisma.vendor.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingVendor) {
      return NextResponse.json(
        { success: false, error: "Vendor not found" },
        { status: 404 }
      );
    }

    // Update vendor status
    let updatedVendor;
    try {
      updatedVendor = await prisma.vendor.update({
        where: { id },
        data: { status },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          active: true,
          status: true,
        },
      });
    } catch (updateError: any) {
      console.error("Prisma update error:", updateError);
      // Check if it's a schema issue (column doesn't exist)
      if (updateError?.message?.includes("Unknown column") || 
          updateError?.message?.includes("column") && updateError?.message?.includes("does not exist")) {
        return NextResponse.json(
          { 
            success: false, 
            error: "Database schema error: status column may not exist. Please run database migrations." 
          },
          { status: 500 }
        );
      }
      // Re-throw to be caught by outer catch
      throw updateError;
    }

    return NextResponse.json({ success: true, data: updatedVendor });
  } catch (error: any) {
    console.error("Error updating vendor status:", error);
    console.error("Error details:", {
      code: error?.code,
      message: error?.message,
      meta: error?.meta,
      stack: error?.stack,
    });
    
    // Provide more specific error messages
    let errorMessage = "Failed to update vendor status";
    if (error?.code === "P2025") {
      errorMessage = "Vendor not found";
    } else if (error?.code === "P2002") {
      errorMessage = "A record with this value already exists";
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}


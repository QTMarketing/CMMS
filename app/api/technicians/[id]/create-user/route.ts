import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isAdminLike((session.user as any)?.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id: technicianId } = await params;

    const vendor = await prisma.vendor.findUnique({
      where: { id: technicianId },
    });

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: "Vendor not found." },
        { status: 404 }
      );
    }

    if (!vendor.storeId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vendor does not have a store assigned. Please set a store before creating a login.",
        },
        { status: 400 }
      );
    }

    const existingUserForVendor = await prisma.user.findFirst({
      where: { vendorId: technicianId },
    });

    if (existingUserForVendor) {
      return NextResponse.json(
        { success: false, error: "Vendor already has a login." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { email, initialPassword } = body ?? {};

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "Email is required." },
        { status: 400 }
      );
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: "Invalid email address." },
        { status: 400 }
      );
    }

    if (
      !initialPassword ||
      typeof initialPassword !== "string" ||
      !initialPassword.trim()
    ) {
      return NextResponse.json(
        { success: false, error: "Initial password is required." },
        { status: 400 }
      );
    }

    if (initialPassword.trim().length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const existingByEmail = await prisma.user.findUnique({
      where: { email: email.trim() },
    });

    if (existingByEmail) {
      return NextResponse.json(
        { success: false, error: "Email is already in use." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(initialPassword.trim(), 10);

    const user = await prisma.user.create({
      data: {
        email: email.trim(),
        password: hashedPassword,
        role: "VENDOR",
        vendorId: technicianId,
        // Align the user with the vendor's store so store-based scoping works.
        storeId: vendor.storeId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          vendorId: user.vendorId,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating vendor user:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create vendor login." },
      { status: 500 }
    );
  }
}



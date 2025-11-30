import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";

// Allow both new and legacy roles at the API layer; the UI only offers
// MASTER_ADMIN, STORE_ADMIN, and TECHNICIAN.
const ALLOWED_ROLES = [
  "MASTER_ADMIN",
  "STORE_ADMIN",
  "ADMIN",
  "TECHNICIAN",
] as const;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isAdminLike((session.user as any)?.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      email,
      password,
      role: requestedRole,
      storeId: rawStoreId,
    } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Name is required." },
        { status: 400 }
      );
    }

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

    if (!password || typeof password !== "string" || !password.trim()) {
      return NextResponse.json(
        { success: false, error: "Password is required." },
        { status: 400 }
      );
    }

    if (password.trim().length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 6 characters.",
        },
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

    const normalizedRole =
      typeof requestedRole === "string"
        ? requestedRole.toUpperCase()
        : "TECHNICIAN";

    const isAllowedRole = ALLOWED_ROLES.includes(
      normalizedRole as (typeof ALLOWED_ROLES)[number]
    );

    const finalRole = isAllowedRole ? normalizedRole : "TECHNICIAN";

    // Determine and validate storeId based on role semantics.
    let storeId: string | null = null;

    if (finalRole === "MASTER_ADMIN") {
      storeId = null;
    } else if (finalRole === "STORE_ADMIN" || finalRole === "TECHNICIAN") {
      const storeIdValue =
        typeof rawStoreId === "string" && rawStoreId.trim().length > 0
          ? rawStoreId.trim()
          : null;

      if (!storeIdValue) {
        return NextResponse.json(
          {
            success: false,
            error: "Store is required for store admins and technicians.",
          },
          { status: 400 }
        );
      }

      const store = await prisma.store.findUnique({
        where: { id: storeIdValue },
      });

      if (!store) {
        return NextResponse.json(
          { success: false, error: "Invalid store selected." },
          { status: 400 }
        );
      }

      storeId = store.id;
    } else {
      // Legacy ADMIN or any other admin-like role: keep store-less for now.
      storeId = null;
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const user = await prisma.user.create({
      data: {
        email: email.trim(),
        password: hashedPassword,
        role: finalRole,
        storeId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          technicianId: user.technicianId,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating user:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create user." },
      { status: 500 }
    );
  }
}



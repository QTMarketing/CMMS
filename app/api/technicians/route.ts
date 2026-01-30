import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike, isMasterAdmin, isVendor } from "@/lib/roles";
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

    const role = (session.user as any)?.role as string | undefined;
    const userStoreId = ((session.user as any)?.storeId ?? null) as
      | string
      | null;

    const where: any = {};
    const urlStoreId = req.nextUrl.searchParams.get("storeId") || null;

    if (canSeeAllStores(role)) {
      // MASTER_ADMIN can filter by storeId from URL if provided
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

    const items = await prisma.vendor.findMany({
      where,
      orderBy: { name: "asc" },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch vendors" },
      { status: 500 }
    );
  }
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

    // Only admin-like roles may create vendors; VENDOR explicitly forbidden.
    if (!isAdminLike(role) || isVendor(role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, phone, active, storeId: rawStoreId, password } = body ?? {};

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
        { success: false, error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    // Check if email is already in use (either as vendor or user)
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Email is already in use." },
        { status: 400 }
      );
    }

    const bodyStoreId =
      typeof rawStoreId === "string" && rawStoreId.trim().length > 0
        ? rawStoreId.trim()
        : null;

    let storeId: string | null = null;

    if (isMasterAdmin(role)) {
      // MASTER_ADMIN must supply storeId in the request body.
      if (!bodyStoreId) {
        return NextResponse.json(
          {
            success: false,
            error: "storeId is required for vendors.",
          },
          { status: 400 }
        );
      }
      storeId = bodyStoreId;
    } else {
      // STORE_ADMIN: force vendor into their own store,
      // ignoring any storeId passed in the body.
      storeId = userStoreId;
      if (!storeId) {
        return NextResponse.json(
          {
            success: false,
            error: "User has no store assigned.",
          },
          { status: 400 }
        );
      }
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Invalid store selected." },
        { status: 400 }
      );
    }

    // Create vendor first
    const vendorId = crypto.randomUUID();
    const newVendor = await prisma.vendor.create({
      data: {
        id: vendorId,
        name: name.trim(),
        email: email.trim(),
        phone: phone && typeof phone === "string" ? phone.trim() : null,
        active: typeof active === "boolean" ? active : true,
        storeId: store.id,
      },
    });

    // Create user account for login
    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    await prisma.user.create({
      data: {
        email: email.trim(),
        password: hashedPassword,
        role: "VENDOR",
        storeId: store.id,
        vendorId: vendorId,
      },
    });

    return NextResponse.json(
      { success: true, data: newVendor },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating vendor:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create vendor." },
      { status: 500 }
    );
  }
}

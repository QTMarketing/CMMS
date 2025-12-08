import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike, isMasterAdmin, isTechnician } from "@/lib/roles";
import { canSeeAllStores, getScopedStoreId } from "@/lib/storeAccess";

export async function GET() {
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

  if (!canSeeAllStores(role)) {
    const scopedStoreId = getScopedStoreId(role, userStoreId);
    if (scopedStoreId) {
      where.storeId = scopedStoreId;
    } else {
      where.storeId = "__never_match__";
    }
  }

  const items = await prisma.technician.findMany({
    where,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(items);
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

    // Only admin-like roles may create technicians; TECHNICIAN explicitly forbidden.
    if (!isAdminLike(role) || isTechnician(role)) {
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

    // Check if email is already in use (either as technician or user)
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
            error: "storeId is required for technicians.",
          },
          { status: 400 }
        );
      }
      storeId = bodyStoreId;
    } else {
      // STORE_ADMIN: force technician into their own store,
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

    // Create technician first
    const technicianId = crypto.randomUUID();
    const newTech = await prisma.technician.create({
      data: {
        id: technicianId,
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
        role: "TECHNICIAN",
        storeId: store.id,
        technicianId: technicianId,
      },
    });

    return NextResponse.json(
      { success: true, data: newTech },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating technician:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create technician." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isMasterAdmin, isAdminLike } from "@/lib/roles";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isAdminLike((session.user as any)?.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const role = (session.user as any)?.role as string | undefined;
    const userStoreId = ((session.user as any)?.storeId ?? null) as
      | string
      | null;

    // MASTER_ADMIN sees all stores, STORE_ADMIN sees only their store
    if (isMasterAdmin(role)) {
      const stores = await prisma.store.findMany({
        orderBy: { name: "asc" },
      });
      return NextResponse.json({ success: true, data: stores });
    } else {
      // STORE_ADMIN: return only their store
      if (!userStoreId) {
        return NextResponse.json({ success: true, data: [] });
      }
      const store = await prisma.store.findUnique({
        where: { id: userStoreId },
      });
      return NextResponse.json({
        success: true,
        data: store ? [store] : [],
      });
    }
  } catch (error) {
    console.error("Error fetching stores:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stores" },
      { status: 500 }
    );
  }
}

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
      code,
      address,
      city,
      state,
      zipCode,
      managerEmail,
      managerPassword,
      categoryIds,
    } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Name is required." },
        { status: 400 }
      );
    }

    if (code && typeof code !== "string") {
      return NextResponse.json(
        { success: false, error: "Code must be a string." },
        { status: 400 }
      );
    }

    // Optional uniqueness pre-check for code when provided
    if (code && code.trim()) {
      const existingByCode = await prisma.store.findUnique({
        where: { code: code.trim() },
      });

      if (existingByCode) {
        return NextResponse.json(
          { success: false, error: "Code is already in use." },
          { status: 400 }
        );
      }
    }

    // Generate unique QR code token for this store
    const qrCode = nanoid(32);

    const store = await prisma.store.create({
      data: {
        name: name.trim(),
        code: code && code.trim() ? code.trim() : null,
        address:
          address && typeof address === "string" ? address.trim() : null,
        city: city && typeof city === "string" ? city.trim() : null,
        state: state && typeof state === "string" ? state.trim() : null,
        zipCode:
          zipCode && typeof zipCode === "string" ? zipCode.trim() : null,
        qrCode: qrCode,
        ...(Array.isArray(categoryIds) && categoryIds.length
          ? {
              categories: {
                connect: categoryIds.map((id: string) => ({ id })),
              },
            }
          : {}),
      },
    });

    // Optionally create a store manager user account if email and password are provided
    if (managerEmail && managerPassword) {
      const emailTrimmed = typeof managerEmail === "string" ? managerEmail.trim() : "";
      const passwordTrimmed = typeof managerPassword === "string" ? managerPassword.trim() : "";

      if (emailTrimmed && passwordTrimmed) {
        // Validate email format
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(emailTrimmed)) {
          // Store was created, but user creation failed due to invalid email
          return NextResponse.json(
            { 
              success: false, 
              error: "Store created, but manager email is invalid.",
              data: store 
            },
            { status: 400 }
          );
        }

        // Validate password length
        if (passwordTrimmed.length < 6) {
          return NextResponse.json(
            { 
              success: false, 
              error: "Store created, but password must be at least 6 characters.",
              data: store 
            },
            { status: 400 }
          );
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: emailTrimmed },
        });

        if (existingUser) {
          return NextResponse.json(
            { 
              success: false, 
              error: "Store created, but email is already in use.",
              data: store 
            },
            { status: 400 }
          );
        }

        // Hash password and create user
        try {
          const hashedPassword = await bcrypt.hash(passwordTrimmed, 10);
          
          await prisma.user.create({
            data: {
              email: emailTrimmed,
              password: hashedPassword,
              role: "STORE_ADMIN",
              storeId: store.id,
            },
          });
        } catch (userError) {
          console.error("Error creating store manager user:", userError);
          // Store was created successfully, but user creation failed
          return NextResponse.json(
            { 
              success: true, 
              data: store,
              warning: "Store created, but failed to create manager user account."
            },
            { status: 201 }
          );
        }
      }
    }

    return NextResponse.json(
      { success: true, data: store },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating store:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create store." },
      { status: 500 }
    );
  }
}



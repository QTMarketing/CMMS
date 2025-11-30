import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isMasterAdmin } from "@/lib/roles";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !isMasterAdmin((session.user as any)?.role)) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  const stores = await prisma.store.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: stores });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isMasterAdmin((session.user as any)?.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, code, address, city, state, timezone } = body ?? {};

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

    const store = await prisma.store.create({
      data: {
        name: name.trim(),
        code: code && code.trim() ? code.trim() : null,
        address: address && typeof address === "string" ? address.trim() : null,
        city: city && typeof city === "string" ? city.trim() : null,
        state: state && typeof state === "string" ? state.trim() : null,
        timezone:
          timezone && typeof timezone === "string" ? timezone.trim() : null,
      },
    });

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



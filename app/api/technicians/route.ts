import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const items = await prisma.technician.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    const role = (session?.user as any)?.role;
    if (!session || role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, phone, active } = body ?? {};

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

    const newTech = await prisma.technician.create({
      data: {
        id: crypto.randomUUID(),
        name: name.trim(),
        email: email.trim(),
        phone: phone && typeof phone === "string" ? phone.trim() : null,
        active: typeof active === "boolean" ? active : true,
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

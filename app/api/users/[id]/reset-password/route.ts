import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;
    const role = sessionUser?.role as string | undefined;

    // Only MASTER_ADMIN and ADMIN can reset passwords
    if (!session || (role !== "MASTER_ADMIN" && role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const newPassword = body?.newPassword as string | undefined;

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashed },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reset-password] Failed", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}



import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";

const ALLOWED_ROLES = ["MASTER_ADMIN", "STORE_ADMIN", "ADMIN", "TECHNICIAN", "USER"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;
    const sessionRole = sessionUser?.role as string | undefined;

    if (!session || !isAdminLike(sessionRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id: userId } = await params;

    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "User not found." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { role } = body ?? {};

    if (!role || typeof role !== "string") {
      return NextResponse.json(
        { success: false, error: "Role is required." },
        { status: 400 }
      );
    }

    const normalizedRole = role.toUpperCase();
    if (
      !ALLOWED_ROLES.includes(normalizedRole as (typeof ALLOWED_ROLES)[number])
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid role." },
        { status: 400 }
      );
    }

    const isSelf = sessionUser?.id && sessionUser.id === existing.id;

    if (existing.role === "ADMIN" && normalizedRole !== "ADMIN" && isSelf) {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN" },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          {
            success: false,
            error:
              "You cannot change your role because you are the last admin user.",
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        role: normalizedRole,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        technicianId: updated.technicianId,
      },
    });
  } catch (err) {
    console.error("Error updating user role:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update user." },
      { status: 500 }
    );
  }
}



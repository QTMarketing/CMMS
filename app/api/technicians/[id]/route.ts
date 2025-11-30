import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  isAdminLike,
  isMasterAdmin,
  isTechnician as isTechnicianRole,
} from "@/lib/roles";

type RouteContext = {
  params: { id: string };
};

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const role = (session.user as any)?.role as string | undefined;
    const userStoreId = ((session.user as any)?.storeId ?? null) as
      | string
      | null;

    // Only admin-like roles may toggle technicians; technicians themselves cannot.
    if (!isAdminLike(role) || isTechnicianRole(role)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const tech = await prisma.technician.findUnique({
      where: { id: params.id },
    });

    if (!tech) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    // Enforce multi-store: MASTER_ADMIN can update any technician.
    // STORE_ADMIN is limited to technicians in their own store.
    if (!isMasterAdmin(role)) {
      if (!userStoreId || tech.storeId !== userStoreId) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    const { active } = body ?? {};

    if (typeof active !== "boolean") {
      return NextResponse.json(
        { error: "active must be boolean" },
        { status: 400 }
      );
    }

    const updated = await prisma.technician.update({
      where: { id: tech.id },
      data: { active },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("Error updating technician active status:", err);
    return NextResponse.json(
      { error: "Failed to update technician." },
      { status: 500 }
    );
  }
}



import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { nanoid } from "nanoid";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const role = (session.user as any)?.role;
  const technicianId = ((session.user as any)?.technicianId ?? null) as
    | string
    | null;

  const where =
    role === "TECHNICIAN" && technicianId
      ? { assignedToId: technicianId }
      : {};

  const result = await prisma.workOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      notes: true,
    },
  });
  return NextResponse.json({ success: true, data: result });
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
    const { title, assetId, priority, assignedTo, dueDate, description } = body;

    if (!title || !assetId || !priority) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 }
      );
    }
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return NextResponse.json(
        { success: false, error: "Asset not found." },
        { status: 400 }
      );
    }
    if (assignedTo) {
      const tech = await prisma.technician.findUnique({
        where: { id: assignedTo },
      });
      if (!tech) {
        return NextResponse.json(
          { success: false, error: "Technician not found." },
          { status: 400 }
        );
      }
    }
    if (dueDate && isNaN(Date.parse(dueDate))) {
      return NextResponse.json(
        { success: false, error: "Invalid due date." },
        { status: 400 }
      );
    }
    if (!["Low", "Medium", "High"].includes(priority)) {
      return NextResponse.json(
        { success: false, error: "Invalid priority." },
        { status: 400 }
      );
    }

    const newWorkOrder = await prisma.workOrder.create({
      data: {
        id: nanoid(),
        title,
        assetId,
        priority,
        status: "Open",
        assignedToId: assignedTo || undefined,
        createdAt: new Date(),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        description: description || undefined,
      },
    });
    return NextResponse.json({ success: true, data: newWorkOrder }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}

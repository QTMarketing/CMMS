"use server";

import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";

export async function approveRequest(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!isAdminLike((session?.user as any)?.role)) redirect("/workorders");

  const requestId = formData.get("requestId") as string | null;
  if (!requestId) {
    redirect("/requests");
  }

  await prisma.request.update({
    where: { id: requestId },
    data: { status: "Approved" },
  });

  redirect("/requests");
}

export async function rejectRequest(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!isAdminLike((session?.user as any)?.role)) redirect("/workorders");

  const requestId = formData.get("requestId") as string | null;
  if (!requestId) {
    redirect("/requests");
  }

  await prisma.request.update({
    where: { id: requestId },
    data: { status: "Rejected" },
  });

  redirect("/requests");
}

export async function convertRequestToWorkOrder(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!isAdminLike((session?.user as any)?.role)) redirect("/workorders");

  const requestId = formData.get("requestId") as string | null;
  if (!requestId) {
    redirect("/requests");
  }

  const request = await prisma.request.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    redirect("/requests");
  }

  // For now, only allow conversion when the request has an assetId,
  // to respect the existing WorkOrder schema (assetId is required).
  if (!request.assetId) {
    redirect("/requests");
  }

  await prisma.workOrder.create({
    data: {
      id: nanoid(),
      title: `Request: ${request.title}`,
      description: request.description,
      assetId: request.assetId,
      status: "Open",
      priority: request.priority,
      dueDate: null,
      assignedToId: null,
    },
  });

  await prisma.request.update({
    where: { id: requestId },
    data: { status: "Converted" },
  });

  redirect("/workorders");
}



"use server";

import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";
import { sendRequestApprovedEmail, sendRequestRejectedEmail } from "@/lib/email";

export async function approveRequest(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!isAdminLike((session?.user as any)?.role)) redirect("/workorders");

  const requestId = formData.get("requestId") as string | null;
  if (!requestId) {
    redirect("/requests");
  }

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: { id: true, title: true, requestNumber: true, createdBy: true },
  });

  if (!request) {
    redirect("/requests");
  }

  await prisma.request.update({
    where: { id: requestId },
    data: { status: "Approved", rejectionReason: null },
  });

  const submitterEmail = request.createdBy?.trim();
  if (submitterEmail) {
    try {
      await sendRequestApprovedEmail({
        toEmail: submitterEmail,
        requestId: request.id,
        requestNumber: request.requestNumber,
        title: request.title,
      });
    } catch (e) {
      console.error("[requests] Failed to send approval email", e);
    }
  }

  redirect("/requests");
}

export async function rejectRequest(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!isAdminLike((session?.user as any)?.role)) redirect("/workorders");

  const requestId = formData.get("requestId") as string | null;
  const reason = (formData.get("rejectionReason") as string | null)?.trim() ?? "";

  if (!requestId) {
    redirect("/requests");
  }

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: { id: true, title: true, requestNumber: true, createdBy: true },
  });

  if (!request) {
    redirect("/requests");
  }

  await prisma.request.update({
    where: { id: requestId },
    data: { status: "Rejected", rejectionReason: reason || null },
  });

  const submitterEmail = request.createdBy?.trim();
  if (submitterEmail) {
    try {
      await sendRequestRejectedEmail({
        toEmail: submitterEmail,
        requestId: request.id,
        requestNumber: request.requestNumber,
        title: request.title,
        reason: reason || "No reason provided.",
      });
    } catch (e) {
      console.error("[requests] Failed to send rejection email", e);
    }
  }

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

  // Allow conversion with or without asset (WorkOrder.assetId is optional)
  const newWorkOrder = await prisma.workOrder.create({
    data: {
      id: nanoid(),
      title: `Request: ${request.title}`,
      description: request.description ?? undefined,
      assetId: request.assetId ?? null,
      status: "Open",
      priority: request.priority ?? "Medium",
      dueDate: null,
      assignedToId: null,
      storeId: request.storeId ?? null,
      partsRequired: false,
      attachments: Array.isArray(request.attachments) ? request.attachments : [],
    },
  });

  await prisma.request.update({
    where: { id: requestId },
    data: { status: "Converted" },
  });

  // Send user to the new work order so they see where it went
  redirect(`/workorders/${newWorkOrder.id}`);
}



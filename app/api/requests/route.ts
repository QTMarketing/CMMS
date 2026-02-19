import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { nanoid } from "nanoid";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike, canCreateRequests } from "@/lib/roles";
import { getScopedStoreId, canSeeAllStores } from "@/lib/storeAccess";
import {
  sendRequestSubmissionConfirmationEmail,
  sendRequestSubmittedEmail,
} from "@/lib/email";

export async function GET(req: NextRequest) {
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

    const where: any = {};

    if (canSeeAllStores(role)) {
      // MASTER_ADMIN can see all requests
    } else {
      const scopedStoreId = getScopedStoreId(role, userStoreId);
      if (scopedStoreId) {
        where.storeId = scopedStoreId;
      } else {
        where.storeId = "__never_match__";
      }
    }

    // USER role can only see their own requests
    if (role === "USER") {
      const userEmail = (session.user as any)?.email as string | undefined;
      if (userEmail) {
        where.createdBy = userEmail;
      } else {
        where.createdBy = "__never_match__";
      }
    }

    const requests = await prisma.request.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
    const userEmail = (session.user as any)?.email as string | undefined;

    // Check if user can create requests
    if (!canCreateRequests(role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, description, assetId, priority, storeId: rawStoreId, attachments } = body ?? {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Title is required." },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json(
        { success: false, error: "Description is required." },
        { status: 400 }
      );
    }

    // Require asset for all new maintenance requests
    if (!assetId || typeof assetId !== "string" || !assetId.trim()) {
      return NextResponse.json(
        { success: false, error: "Asset is required for maintenance requests." },
        { status: 400 }
      );
    }

    // Determine storeId based on role
    let storeId: string | null = null;
    if (isAdminLike(role)) {
      // Admins can specify storeId, default to their own store
      storeId = rawStoreId || userStoreId;
    } else {
      // USER role must use their own store
      storeId = userStoreId;
      if (!storeId) {
        return NextResponse.json(
          { success: false, error: "User has no store assigned." },
          { status: 400 }
        );
      }
    }

    // Validate asset (now required above)
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });
    if (!asset) {
      return NextResponse.json(
        { success: false, error: "Asset not found." },
        { status: 400 }
      );
    }

    // Determine next global requestNumber
    const lastRequest = await prisma.request.findFirst({
      orderBy: { requestNumber: "desc" },
      select: { requestNumber: true },
    });
    const nextRequestNumber = (lastRequest?.requestNumber ?? 0) + 1;

    // Create the request
    const newRequest = await prisma.request.create({
      data: {
        id: nanoid(),
        requestNumber: nextRequestNumber,
        title: title.trim(),
        description: description.trim(),
        assetId,
        priority: priority || "Medium",
        status: "Open",
        attachments: Array.isArray(attachments) ? attachments : [],
        createdBy: userEmail || "Unknown",
        storeId: storeId,
      },
    });

    // Notify submitter (confirmation) and admins (new request)
    try {
      const store = storeId
        ? await prisma.store.findUnique({
            where: { id: storeId },
            select: { name: true },
          })
        : null;

      // 1. Send confirmation to the user who submitted (using their account email)
      if (userEmail && userEmail.trim()) {
        await sendRequestSubmissionConfirmationEmail({
          toEmail: userEmail.trim(),
          requestId: newRequest.id,
          requestNumber: newRequest.requestNumber,
          title: newRequest.title,
          storeName: store?.name ?? undefined,
        });
      }

      // 2. Notify all admins and master admins (using their account emails)
      const admins = await prisma.user.findMany({
        where: {
          OR: [
            { role: "MASTER_ADMIN" },
            ...(storeId
              ? [{ role: { in: ["STORE_ADMIN", "ADMIN"] }, storeId }]
              : []),
          ],
        },
        select: { email: true },
      });

      if (admins.length) {
        const requesterName = (session.user as any)?.name;
        await Promise.all(
          admins
            .map((a) => a.email)
            .filter(Boolean)
            .map((email) =>
              sendRequestSubmittedEmail({
                storeAdminEmail: email,
                requesterEmail: userEmail || undefined,
                requesterName:
                  typeof requesterName === "string" ? requesterName : undefined,
                storeName: store?.name ?? undefined,
                requestId: newRequest.id,
                requestNumber: newRequest.requestNumber,
                summary: newRequest.title,
              })
            )
        );
      }
    } catch (error) {
      console.error(
        "[requests POST] Failed to send submission/admin notification emails",
        error
      );
    }

    return NextResponse.json(
      { success: true, data: newRequest },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create request" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { nanoid } from "nanoid";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";
import { sendEmail } from "@/lib/email";
import { canSeeAllStores, getScopedStoreId } from "@/lib/storeAccess";

function getDaysUntilDue(dueDate: string) {
  const today = new Date();
  const due = new Date(dueDate);
  today.setUTCHours(0,0,0,0);
  due.setUTCHours(0,0,0,0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET(req: NextRequest) {
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
    const urlStoreId = req.nextUrl.searchParams.get("storeId") || null;

    const where: any = {};

    if (canSeeAllStores(role)) {
      if (urlStoreId) {
        where.storeId = urlStoreId;
      }
    } else {
      const scopedStoreId = getScopedStoreId(role, userStoreId);
      if (scopedStoreId) {
        where.storeId = scopedStoreId;
      } else {
        where.storeId = "__never_match__";
      }
    }

    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    const schedules = await prisma.preventiveSchedule.findMany({ where });
    const data = schedules.map((s) => {
      const daysUntilDue = getDaysUntilDue(s.nextDueDate.toISOString());
      const due = daysUntilDue <= 0 && s.active;
      return {
        ...s,
        daysUntilDue,
        due,
      };
    });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Error fetching schedules:", err);
    // Fail soft with empty list so UI can still render
    return NextResponse.json(
      { success: true, data: [] },
      { status: 200 }
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

    const role = (session.user as any)?.role as string | undefined;
    const userStoreId = ((session.user as any)?.storeId ?? null) as string | null;

    const body = await req.json();
    const { title, assetId, frequencyDays, nextDueDate, active, storeId: rawStoreId } = body ?? {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Title is required." },
        { status: 400 }
      );
    }

    if (!assetId || typeof assetId !== "string") {
      return NextResponse.json(
        { success: false, error: "Asset ID is required." },
        { status: 400 }
      );
    }

    if (!frequencyDays || typeof frequencyDays !== "number" || frequencyDays <= 0) {
      return NextResponse.json(
        { success: false, error: "Frequency must be a positive number." },
        { status: 400 }
      );
    }

    if (!nextDueDate || typeof nextDueDate !== "string") {
      return NextResponse.json(
        { success: false, error: "Next due date is required." },
        { status: 400 }
      );
    }

    // Verify asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      return NextResponse.json(
        { success: false, error: "Asset not found." },
        { status: 404 }
      );
    }

    // Determine storeId
    let finalStoreId: string | null = null;
    if (canSeeAllStores(role)) {
      // MASTER_ADMIN can specify storeId or use asset's storeId
      finalStoreId = rawStoreId || asset.storeId || null;
    } else {
      // Store-scoped admins use their own storeId
      finalStoreId = userStoreId;
      if (!finalStoreId) {
        return NextResponse.json(
          { success: false, error: "Your user account is not associated with a store." },
          { status: 400 }
        );
      }
    }

    const schedule = await prisma.preventiveSchedule.create({
      data: {
        id: nanoid(),
        title: title.trim(),
        assetId,
        frequencyDays,
        nextDueDate: new Date(nextDueDate),
        active: active !== false, // Default to true
        storeId: finalStoreId,
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Notify admins about new preventive maintenance schedule
    try {
      const admins = await prisma.user.findMany({
        where: {
          OR: [
            { role: "MASTER_ADMIN" },
            ...(finalStoreId
              ? [{ role: { in: ["STORE_ADMIN", "ADMIN"] }, storeId: finalStoreId }]
              : []),
          ],
        },
        select: { email: true },
      });

      if (admins.length) {
        await sendEmail({
          to: admins.map((a) => a.email).filter(Boolean),
          subject: `New Preventive Schedule Created (${schedule.title})`,
          html: `<p>A new preventive maintenance schedule has been created.</p>
<p><strong>Title:</strong> ${schedule.title}</p>
<p><strong>Asset:</strong> ${schedule.asset?.name ?? "N/A"}</p>
<p><strong>Next Due Date:</strong> ${schedule.nextDueDate.toISOString()}</p>`,
        });
      }
    } catch (error) {
      console.error(
        "[schedules POST] Failed to send admin notification email on PM create",
        error
      );
    }

    return NextResponse.json(
      { success: true, data: schedule },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating PM schedule:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create PM schedule" },
      { status: 500 }
    );
  }
}

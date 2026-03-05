import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { nanoid } from "nanoid";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";
import { sendSharedWorkOrderEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isAdminLike((session.user as any)?.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const rawEmail = (body?.email as string | undefined) ?? "";
    const email = rawEmail.trim();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required." },
        { status: 400 }
      );
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email address." },
        { status: 400 }
      );
    }

    const existing = await prisma.workOrder.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        shareToken: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Work order not found." },
        { status: 404 }
      );
    }

    let shareToken = existing.shareToken;
    if (!shareToken) {
      shareToken = nanoid(32);
      await prisma.workOrder.update({
        where: { id: existing.id },
        data: { shareToken },
      });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXTAUTH_URL ||
      "https://cmms-theta.vercel.app";
    const normalizedBase = baseUrl.replace(/\/+$/, "");
    const shareUrl = `${normalizedBase}/share/workorder/${shareToken}`;

    const result = await sendSharedWorkOrderEmail({
      toEmail: email,
      workOrderTitle: existing.title ?? undefined,
      shareUrl,
    });

    if (!result.sent) {
      return NextResponse.json(
        {
          success: false,
          error:
            result.error ||
            "Failed to send email. Please verify email settings.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[workorders share-email] Failed to share work order", error);
    return NextResponse.json(
      { success: false, error: "Failed to share work order by email." },
      { status: 500 }
    );
  }
}


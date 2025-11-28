import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

function getDaysUntilDue(dueDate: string) {
  const today = new Date();
  const due = new Date(dueDate);
  today.setUTCHours(0,0,0,0);
  due.setUTCHours(0,0,0,0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session || role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  const now = new Date();
  now.setUTCHours(0,0,0,0);
  const schedules = await prisma.preventiveSchedule.findMany();
  const data = schedules.map(s => {
    const daysUntilDue = getDaysUntilDue(s.nextDueDate.toISOString());
    const due = daysUntilDue <= 0 && s.active;
    return {
      ...s,
      daysUntilDue,
      due,
    };
  });
  return NextResponse.json({ success: true, data });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isAdminLike((session.user as any)?.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const today = startOfDay(new Date());

    // Find active PM schedules that are due or overdue
    const dueSchedules = await prisma.preventiveSchedule.findMany({
      where: {
        active: true,
        nextDueDate: {
          lte: today,
        },
      },
      include: {
        asset: true,
      },
    });

    let generatedCount = 0;

    for (const schedule of dueSchedules) {
      // Avoid duplicate open PM WOs (best-guess heuristic)
      const existingOpen = await prisma.workOrder.findFirst({
        where: {
          assetId: schedule.assetId,
          status: { in: ["Open", "In Progress"] },
          title: `PM: ${schedule.title}`,
        },
      });

      if (!existingOpen) {
        // Create the PM work order for this schedule
        await prisma.workOrder.create({
          data: {
            id: crypto.randomUUID(),
            title: `PM: ${schedule.title}`,
            description: null,
            assetId: schedule.assetId,
            status: "Open",
            priority: "Medium",
            dueDate: schedule.nextDueDate,
            assignedToId: null,
          },
        });

        generatedCount++;
      }

      // Advance PM nextDueDate into the future based on frequencyDays
      // so that "Days Until Due" reflects the next cycle immediately.
      let newNextDue = schedule.nextDueDate;

      while (newNextDue <= today) {
        newNextDue = new Date(
          newNextDue.getFullYear(),
          newNextDue.getMonth(),
          newNextDue.getDate() + schedule.frequencyDays
        );
      }

      await prisma.preventiveSchedule.update({
        where: { id: schedule.id },
        data: { nextDueDate: newNextDue },
      });
    }

    return NextResponse.json({
      ok: true,
      generated: generatedCount,
      processed: dueSchedules.length,
    });
  } catch (err) {
    console.error("Error in /api/pm/generate-due:", err);
    return NextResponse.json(
      { error: "Failed to generate work orders" },
      { status: 500 }
    );
  }
}


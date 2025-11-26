import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function POST() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 🟧 DEBUG LOG #1 — route is being hit
  console.log("⏳ [PM-GENERATE] API CALLED at", now.toISOString());

  try {
    // Find schedules that are <= today
    const dueSchedules = await prisma.preventiveSchedule.findMany({
      where: {
        active: true,
        nextDueDate: { lte: today },
      },
      include: { asset: true },
    });

    // 🟧 DEBUG LOG #2 — how many schedules are due?
    console.log("📌 [PM-GENERATE] Due schedules found:", dueSchedules.length);

    // If nothing is due, return early
    if (dueSchedules.length === 0) {
      console.log("➡ [PM-GENERATE] No schedules due. Exiting.");
      return NextResponse.json({ generatedCount: 0 });
    }

    let generatedCount = 0;

    for (const schedule of dueSchedules) {
      console.log(
        `🛠 [PM-GENERATE] Creating WO for schedule: ${schedule.id} | title: ${schedule.title} | oldDueDate: ${schedule.nextDueDate}`
      );

      // Create a Work Order for this schedule
      await prisma.workOrder.create({
        data: {
          id: nanoid(),
          title: schedule.title,
          description: `PM: ${schedule.title} for ${schedule.asset?.name ?? schedule.assetId}`,
          priority: "Medium",
          status: "Open",
          createdAt: now,
          dueDate: today,
          assetId: schedule.assetId,
        },
      });

      // Move nextDueDate forward
      let next = schedule.nextDueDate;
      while (next <= today) {
        next = addDays(next, schedule.frequencyDays);
      }

      console.log(
        `🔁 [PM-GENERATE] Updating schedule ${schedule.id} nextDueDate → ${next}`
      );

      await prisma.preventiveSchedule.update({
        where: { id: schedule.id },
        data: { nextDueDate: next },
      });

      generatedCount++;
    }

    console.log("✅ [PM-GENERATE] Work orders generated:", generatedCount);
    return NextResponse.json({ generatedCount });

  } catch (error) {
    console.error("❌ [PM-GENERATE] Error generating PM work orders:", error);
    return new NextResponse("Failed to generate work orders", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdminLike } from "@/lib/roles";
import { canSeeAllStores, getScopedStoreId } from "@/lib/storeAccess";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    const sessionUser = session?.user as any;
    const role = sessionUser?.role as string | undefined;
    const userStoreId = (sessionUser?.storeId ?? null) as string | null;

    if (!session || !isAdminLike(role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const today = startOfDay(new Date());

    const where: any = {
      active: true,
      nextDueDate: {
        lte: today,
      },
    };

    // MASTER_ADMIN can operate across stores; STORE_ADMIN is scoped to
    // their own storeId.
    if (!canSeeAllStores(role)) {
      const scopedStoreId = getScopedStoreId(role, userStoreId);
      if (scopedStoreId) {
        where.storeId = scopedStoreId;
      } else {
        // No associated store; nothing should be processed.
        where.storeId = "__never_match__";
      }
    }

    // Find active PM schedules that are due or overdue (scoped above).
    const dueSchedules = await prisma.preventiveSchedule.findMany({
      where,
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
        // Create the PM work order for this schedule. Make sure the work order
        // is correctly tied to the same store (falling back to the asset's
        // store if needed) so store-scoped dashboards can see it.
        await prisma.workOrder.create({
          data: {
            id: crypto.randomUUID(),
            title: `PM: ${schedule.title}`,
            description: null,
            assetId: schedule.assetId,
            storeId: schedule.storeId ?? schedule.asset.storeId ?? null,
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
      created: generatedCount,
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


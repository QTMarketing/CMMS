import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isMasterAdmin } from "@/lib/roles";

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

    if (!isMasterAdmin(role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only master admins can generate reports." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { storeId, startDate, endDate } = body || {};

    if (!storeId || typeof storeId !== "string") {
      return NextResponse.json(
        { success: false, error: "Store ID is required." },
        { status: 400 }
      );
    }

    // Verify store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, code: true },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Store not found." },
        { status: 404 }
      );
    }

    // Parse date range
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const end = endDate ? new Date(endDate) : new Date();

    // Fetch data for the store
    const [workOrders, assets, pmSchedules, technicians] = await Promise.all([
      prisma.workOrder.findMany({
        where: {
          storeId,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        include: {
          asset: { select: { name: true } },
          assignedTo: { select: { name: true } },
          createdBy: { select: { email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.asset.findMany({
        where: { storeId },
        orderBy: { name: "asc" },
      }),
      prisma.preventiveSchedule.findMany({
        where: { storeId },
        include: {
          asset: { select: { name: true } },
        },
        orderBy: { nextDueDate: "asc" },
      }),
      prisma.technician.findMany({
        where: { storeId },
        orderBy: { name: "asc" },
      }),
    ]);

    // Generate report data
    const reportData = {
      store: {
        id: store.id,
        name: store.name,
        code: store.code,
      },
      period: {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      },
      summary: {
        totalWorkOrders: workOrders.length,
        openWorkOrders: workOrders.filter((wo) => wo.status === "Open").length,
        inProgressWorkOrders: workOrders.filter((wo) => wo.status === "In Progress").length,
        completedWorkOrders: workOrders.filter((wo) => wo.status === "Completed").length,
        cancelledWorkOrders: workOrders.filter((wo) => wo.status === "Cancelled").length,
        totalAssets: assets.length,
        activeAssets: assets.filter((a) => a.status === "Active").length,
        totalPMSchedules: pmSchedules.length,
        activePMSchedules: pmSchedules.filter((pm) => pm.active).length,
        totalTechnicians: technicians.length,
        activeTechnicians: technicians.filter((t) => t.active).length,
      },
      workOrders: workOrders.map((wo) => ({
        id: wo.id,
        title: wo.title,
        status: wo.status,
        priority: wo.priority,
        createdAt: wo.createdAt.toISOString(),
        completedAt: wo.completedAt?.toISOString() || null,
        dueDate: wo.dueDate?.toISOString() || null,
        assetName: wo.asset?.name || "Unknown",
        assignedToName: wo.assignedTo?.name || "Unassigned",
        createdByEmail: wo.createdBy?.email || "Unknown",
      })),
      assets: assets.map((a) => ({
        id: a.id,
        name: a.name,
        location: a.location,
        status: a.status,
        lastMaintenanceDate: a.lastMaintenanceDate?.toISOString() || null,
        nextMaintenanceDate: a.nextMaintenanceDate?.toISOString() || null,
      })),
      pmSchedules: pmSchedules.map((pm) => ({
        id: pm.id,
        title: pm.title,
        assetName: pm.asset?.name || "Unknown",
        frequencyDays: pm.frequencyDays,
        nextDueDate: pm.nextDueDate.toISOString(),
        active: pm.active,
      })),
      technicians: technicians.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        active: t.active,
        status: t.status,
      })),
      generatedAt: new Date().toISOString(),
    };

    // Create folder structure: location/{storeId}/reports/
    const reportsDir = join(process.cwd(), "public", "location", storeId, "reports");
    if (!existsSync(reportsDir)) {
      await mkdir(reportsDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const filename = `report-${timestamp}.json`;
    const filepath = join(reportsDir, filename);

    // Write report to file
    await writeFile(filepath, JSON.stringify(reportData, null, 2), "utf-8");

    // Return report info
    const reportUrl = `/location/${storeId}/reports/${filename}`;

    return NextResponse.json(
      {
        success: true,
        data: {
          url: reportUrl,
          filename,
          storeName: store.name,
          period: {
            start: reportData.period.start,
            end: reportData.period.end,
          },
          summary: reportData.summary,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate report" },
      { status: 500 }
    );
  }
}


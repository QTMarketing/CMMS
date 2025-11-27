const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  await prisma.note.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.preventiveSchedule.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.asset.deleteMany();

  const asset1 = await prisma.asset.create({
    data: {
      id: "asset-hvac-1",
      name: "HVAC Rooftop Unit 1",
      location: "Store 1 - Roof",
      status: "Active",
      lastMaintenanceDate: new Date("2025-10-01"),
      nextMaintenanceDate: new Date("2025-12-01"),
    },
  });

  const asset2 = await prisma.asset.create({
    data: {
      id: "asset-pump-3",
      name: "Gas Pump #3",
      location: "Store 1 - Forecourt",
      status: "Active",
      lastMaintenanceDate: new Date("2025-11-10"),
      nextMaintenanceDate: new Date("2025-12-10"),
    },
  });

  const tech1 = await prisma.technician.create({
    data: {
      id: "tech-david",
      name: "David Johnson",
      email: "david@example.com",
      phone: "+1-555-1000",
      active: true,
    },
  });

  const tech2 = await prisma.technician.create({
    data: {
      id: "tech-priya",
      name: "Priya Sharma",
      email: "priya@example.com",
      phone: "+1-555-2000",
      active: true,
    },
  });

  await prisma.inventoryItem.createMany({
    data: [
      {
        id: "inv-filter-1",
        name: "Fuel Filter Cartridge",
        partNumber: "FFC-100",
        quantityOnHand: 12,
        reorderThreshold: 5,
        location: "Backroom Shelf A1",
      },
      {
        id: "inv-belt-1",
        name: "HVAC Fan Belt",
        partNumber: "HVB-220",
        quantityOnHand: 4,
        reorderThreshold: 3,
        location: "Mechanical Room Bin B3",
      },
    ],
  });

  await prisma.preventiveSchedule.create({
    data: {
      id: "pm-hvac-1",
      title: "Quarterly HVAC Inspection",
      assetId: asset1.id,
      frequencyDays: 90,
      nextDueDate: new Date("2026-01-15"),
      active: true,
    },
  });

  await prisma.preventiveSchedule.create({
    data: {
      id: "pm-pump-3",
      title: "Monthly Pump Calibration",
      assetId: asset2.id,
      frequencyDays: 30,
      nextDueDate: new Date("2020-12-05"),
      active: true,
    },
  });

  const wo1 = await prisma.workOrder.create({
    data: {
      id: "wo-1",
      title: "Investigate HVAC noise",
      description: "Customer reported loud rattling noise.",
      priority: "High",
      status: "Open",
      createdAt: new Date("2025-11-20T10:00:00Z"),
      dueDate: new Date("2025-11-25T23:59:59Z"),
      assetId: asset1.id,
      assignedToId: tech1.id,
    },
  });

  const wo2 = await prisma.workOrder.create({
    data: {
      id: "wo-2",
      title: "Pump #3 slow flow",
      description: "Flow rate on Pump #3 is much lower.",
      priority: "Medium",
      status: "In Progress",
      createdAt: new Date("2025-11-22T09:30:00Z"),
      dueDate: new Date("2025-11-28T23:59:59Z"),
      assetId: asset2.id,
      assignedToId: tech2.id,
    },
  });

  await prisma.note.createMany({
    data: [
      {
        workOrderId: wo1.id,
        author: "David Johnson",
        text: "Checked filters and belt.",
        timestamp: new Date("2025-11-21T11:00:00Z"),
      },
      {
        workOrderId: wo2.id,
        author: "Priya Sharma",
        text: "Replacing filter and retesting.",
        timestamp: new Date("2025-11-22T12:15:00Z"),
      },
    ],
  });

  // 🔹 Ensure default seeded auth users for dev (ADMIN + TECHNICIAN)
  // Hash passwords using bcryptjs so they work with NextAuth CredentialsProvider.
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const techPasswordHash = await bcrypt.hash("tech123", 10);

  // Admin user (no technician link)
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      password: adminPasswordHash,
      role: "ADMIN",
      technicianId: null,
    },
    create: {
      email: "admin@example.com",
      password: adminPasswordHash,
      role: "ADMIN",
      technicianId: null,
    },
  });

  // Technician user linked to an existing Technician row (here: tech1 / "David Johnson")
  await prisma.user.upsert({
    where: { email: "tech@example.com" },
    update: {
      password: techPasswordHash,
      role: "TECHNICIAN",
      technicianId: tech1.id,
    },
    create: {
      email: "tech@example.com",
      password: techPasswordHash,
      role: "TECHNICIAN",
      technicianId: tech1.id,
    },
  });

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

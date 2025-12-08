const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Updating existing technicians with default status...");
  
  // Get all technicians
  const technicians = await prisma.technician.findMany({
    select: { id: true, status: true }
  });
  
  console.log(`Found ${technicians.length} technicians`);
  
  // Update each technician that doesn't have a valid status
  let updated = 0;
  for (const tech of technicians) {
    if (!tech.status || !["offline", "online", "work_assigned"].includes(tech.status)) {
      await prisma.technician.update({
        where: { id: tech.id },
        data: { status: "offline" }
      });
      updated++;
      console.log(`Updated technician ${tech.id}`);
    }
  }
  
  console.log(`Updated ${updated} technicians with default status.`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

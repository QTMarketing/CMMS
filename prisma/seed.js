const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seed skipped – starting with an empty database.");
  // Intentionally do not create any default data.
  // You can create stores, users, technicians, assets, etc.
  // manually via the UI, API, or Prisma Studio.
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

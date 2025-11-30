const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Creating MASTER_ADMIN user (master@example.com)...");

  const plainPassword = "Admin123!";

  // Hash password using the same algorithm as NextAuth (bcryptjs)
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: "master@example.com" },
    update: {},
    create: {
      email: "master@example.com",
      password: hashedPassword,
      role: "MASTER_ADMIN",
      storeId: null,
    },
  });

  console.log("MASTER_ADMIN user ensured:");
  console.log(`  email: ${user.email}`);
  console.log("You can now log in with:");
  console.log("  email:    master@example.com");
  console.log("  password: Admin123!");
}

main()
  .catch((err) => {
    console.error("Error creating MASTER_ADMIN user:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



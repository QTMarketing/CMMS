const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email =
    process.env.MASTER_ADMIN_EMAIL?.trim() || "master@example.com";
  const plainPassword =
    process.env.MASTER_ADMIN_PASSWORD?.trim() || "Admin123!";

  console.log(
    `Ensuring MASTER_ADMIN user (${email}) exists with the configured password...`
  );

  // Hash password using the same algorithm as NextAuth (bcryptjs)
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: "MASTER_ADMIN",
      storeId: null,
    },
    create: {
        email,
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
    console.error("Error ensuring MASTER_ADMIN user:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });




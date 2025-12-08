const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.MASTER_ADMIN_EMAIL || "master@lamafix.com";
  const password = process.env.MASTER_ADMIN_PASSWORD || "Master123!";

  console.log(`Creating master admin user: ${email}`);

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log("User already exists. Updating password...");
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        role: "MASTER_ADMIN",
        storeId: null, // Master admin has no store
      },
    });
    console.log("✓ Master admin password updated successfully!");
  } else {
    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "MASTER_ADMIN",
        storeId: null, // Master admin has no store
      },
    });
    console.log("✓ Master admin user created successfully!");
  }

  console.log(`\nYou can now login with:`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


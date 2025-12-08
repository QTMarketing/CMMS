// Alternative script that uses environment variables directly
// Run this with: MASTER_ADMIN_EMAIL=master@lamafix.com MASTER_ADMIN_PASSWORD=Master123! node scripts/create-master-admin-direct.js

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Get from environment or use defaults
  const email = process.env.MASTER_ADMIN_EMAIL || "master@lamafix.com";
  const password = process.env.MASTER_ADMIN_PASSWORD || "Master123!";

  console.log(`\n=== Creating Master Admin User ===`);
  console.log(`Email: ${email}`);
  console.log(`\nConnecting to database...`);

  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    if (existing) {
      console.log(`\nUser already exists. Updating password and role...`);
      await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          role: "MASTER_ADMIN",
          storeId: null,
        },
      });
      console.log(`✓ Master admin updated successfully!`);
    } else {
      console.log(`\nCreating new master admin user...`);
      await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "MASTER_ADMIN",
          storeId: null,
        },
      });
      console.log(`✓ Master admin created successfully!`);
    }

    console.log(`\n=== Login Credentials ===`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`\nYou can now login at: http://localhost:3000/login\n`);
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    if (error.message.includes("Can't reach database")) {
      console.error(`\n⚠️  Database connection failed. Please check:`);
      console.error(`1. Your DATABASE_URL in .env file`);
      console.error(`2. If using Neon, make sure the database is not paused`);
      console.error(`3. Your network connection\n`);
    }
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


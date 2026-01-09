const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@quicktrackinc.com";
  const newPassword = process.env.NEW_PASSWORD || "Admin123!";

  console.log(`\n=== Resetting Password for ${email} ===`);
  console.log(`New password: ${newPassword}`);
  console.log(`\nConnecting to database...`);

  try {
    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (!existing) {
      console.log(`\n⚠️  User with email ${email} not found. Creating new user...`);
      
      // Create new user with ADMIN role
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "ADMIN",
          storeId: null,
        },
      });

      console.log(`\n✓ User created successfully!`);
      console.log(`  Email: ${newUser.email}`);
      console.log(`  Role: ${newUser.role}`);
      console.log(`  ID: ${newUser.id}`);
    } else {
      console.log(`\n✓ User found:`);
      console.log(`  Email: ${existing.email}`);
      console.log(`  Role: ${existing.role}`);
      console.log(`  ID: ${existing.id}`);

      // Update the password
      await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
        },
      });

      console.log(`\n✓ Password updated successfully!`);
    }
    console.log(`\n=== Login Credentials ===`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${newPassword}`);
    console.log(`\nYou can now login at: http://localhost:3000/login\n`);
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });


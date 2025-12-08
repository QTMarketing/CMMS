import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Neon requires connection pooling for serverless/Next.js
// Ensure your DATABASE_URL uses the pooler endpoint (has -pooler in hostname)
// Format: postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Handle graceful shutdown
if (typeof window === "undefined") {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}

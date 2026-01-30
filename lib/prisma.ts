import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Neon requires connection pooling for serverless/Next.js
// Ensure your DATABASE_URL uses the pooler endpoint (has -pooler in hostname)
// Format: postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require&connection_limit=50&pool_timeout=20
// Add connection_limit and pool_timeout to your DATABASE_URL for better connection management

// Helper function to retry database operations on connection errors
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const isConnectionError = 
        error?.message?.includes("Closed") ||
        error?.message?.includes("connection") ||
        error?.code === "P1001" || // Connection error
        error?.code === "P1008";   // Operations timed out
      
      if (isConnectionError && attempt < maxRetries) {
        console.warn(`Database connection error (attempt ${attempt}/${maxRetries}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError || new Error("Operation failed after retries");
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Handle connection errors and reconnect
if (typeof window === "undefined") {
  // Handle graceful shutdown
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
  
  process.on("SIGINT", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  
  process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

// Export the retry helper for use in API routes
export { withRetry };

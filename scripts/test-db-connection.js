// Test database connection
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')); // Hide password
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Connection successful!', result);
    
    // Test if Technician table exists and has status column
    try {
      const techCount = await prisma.vendor.count();
      console.log(`✅ Technician table exists with ${techCount} records`);
      
      // Try to query status field
      const tech = await prisma.vendor.findFirst({
        select: { id: true, name: true, status: true },
      });
      console.log('✅ Status column exists:', tech ? 'Yes' : 'No records to check');
    } catch (err) {
      if (err.message.includes('Unknown column') || err.message.includes('does not exist')) {
        console.log('❌ Status column does not exist in database');
        console.log('   Run: ALTER TABLE "Technician" ADD COLUMN "status" TEXT NOT NULL DEFAULT \'offline\';');
      } else {
        throw err;
      }
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check if DATABASE_URL uses pooler endpoint (should have -pooler in hostname)');
    console.error('2. Format should be: postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require');
    console.error('3. Ensure database is not paused in Neon dashboard');
    console.error('4. Check network/firewall settings');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();


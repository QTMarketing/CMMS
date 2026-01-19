// Script to make WorkOrder.assetId nullable
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Making WorkOrder.assetId nullable...');
  
  try {
    // Execute the ALTER TABLE command
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "WorkOrder" 
      ALTER COLUMN "assetId" DROP NOT NULL;
    `);
    
    console.log('✅ Successfully made assetId nullable!');
    console.log('You can now create work orders without selecting an asset.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('does not exist')) {
      console.error('The WorkOrder table or assetId column does not exist.');
    } else if (error.message.includes('already')) {
      console.error('The column may already be nullable.');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

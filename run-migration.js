const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('Running migration: add_qr_code_to_store...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'prisma', 'migrations', 'add_qr_code_to_store.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute the SQL
    await prisma.$executeRawUnsafe(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('The qrCode column has been added to the Store table.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();



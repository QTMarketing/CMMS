-- Create Transfer table for tracking asset and inventory transfers between stores
CREATE TABLE IF NOT EXISTS "Transfer" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "assetId" TEXT,
    "inventoryItemId" TEXT,
    "quantity" INTEGER DEFAULT 1,
    "fromStoreId" TEXT NOT NULL,
    "toStoreId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "transferredById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "Transfer_assetId_idx" ON "Transfer"("assetId");
CREATE INDEX IF NOT EXISTS "Transfer_inventoryItemId_idx" ON "Transfer"("inventoryItemId");
CREATE INDEX IF NOT EXISTS "Transfer_workOrderId_idx" ON "Transfer"("workOrderId");
CREATE INDEX IF NOT EXISTS "Transfer_fromStoreId_idx" ON "Transfer"("fromStoreId");
CREATE INDEX IF NOT EXISTS "Transfer_toStoreId_idx" ON "Transfer"("toStoreId");
CREATE INDEX IF NOT EXISTS "Transfer_createdAt_idx" ON "Transfer"("createdAt");

-- Add foreign key constraints
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Transfer_fromStoreId_fkey'
    ) THEN
        ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromStoreId_fkey" 
            FOREIGN KEY ("fromStoreId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Transfer_toStoreId_fkey'
    ) THEN
        ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toStoreId_fkey" 
            FOREIGN KEY ("toStoreId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Transfer_assetId_fkey'
    ) THEN
        ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_assetId_fkey" 
            FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Transfer_inventoryItemId_fkey'
    ) THEN
        ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_inventoryItemId_fkey" 
            FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Transfer_workOrderId_fkey'
    ) THEN
        ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_workOrderId_fkey" 
            FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Transfer_transferredById_fkey'
    ) THEN
        ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_transferredById_fkey" 
            FOREIGN KEY ("transferredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;





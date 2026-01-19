-- Make WorkOrder.assetId optional (nullable)
-- This allows work orders to be created without an associated asset

ALTER TABLE "WorkOrder" 
ALTER COLUMN "assetId" DROP NOT NULL;

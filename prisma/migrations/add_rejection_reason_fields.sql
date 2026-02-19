-- Migration: Add rejectionReason to Request and WorkOrder
-- Run in Neon SQL editor or psql

-- Request
ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

-- WorkOrder
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

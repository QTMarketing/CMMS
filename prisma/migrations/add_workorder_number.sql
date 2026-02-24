-- Add global workOrderNumber to WorkOrder for human-friendly 4-digit IDs
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "workOrderNumber" INTEGER;
-- Optional: you can backfill existing rows manually if desired.

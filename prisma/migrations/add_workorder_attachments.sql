-- Migration: Add attachments field to WorkOrder table (if missing)
-- Run this against your database (e.g. via psql or Neon SQL editor)
-- Required for images/videos uploaded when creating work orders or when converting requests to work orders.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'WorkOrder' AND column_name = 'attachments'
  ) THEN
    ALTER TABLE "WorkOrder" ADD COLUMN "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
END $$;

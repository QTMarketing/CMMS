-- Migration: Add attachments field to Request table
-- Run this against your database (e.g. via psql or Neon SQL editor)

-- Add attachments column as text array (PostgreSQL array type)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Request' AND column_name = 'attachments'
  ) THEN
    ALTER TABLE "Request" ADD COLUMN "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
END $$;

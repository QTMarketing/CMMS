-- Migration: Add Division and District tables, add district_id to Store (locations)
-- Run this against your database (e.g. via psql or Neon SQL editor)

-- 1. Create Division table
CREATE TABLE IF NOT EXISTS "Division" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

-- 2. Create District table
CREATE TABLE IF NOT EXISTS "District" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "divisionId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "District_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "District_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 3. Add district_id to Store (if column does not exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Store' AND column_name = 'districtId'
  ) THEN
    ALTER TABLE "Store" ADD COLUMN "districtId" TEXT;
  END IF;
END $$;

-- 4. Add foreign key from Store to District (only if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'Store'
      AND constraint_name = 'Store_districtId_fkey'
  ) THEN
    ALTER TABLE "Store"
    ADD CONSTRAINT "Store_districtId_fkey"
    FOREIGN KEY ("districtId") REFERENCES "District" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Optional: Create index for faster lookups
CREATE INDEX IF NOT EXISTS "District_divisionId_idx" ON "District" ("divisionId");
CREATE INDEX IF NOT EXISTS "Store_districtId_idx" ON "Store" ("districtId");

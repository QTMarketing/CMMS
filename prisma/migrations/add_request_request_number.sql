-- Migration: Add global numeric requestNumber to Request
-- Run this against your database (e.g. via psql or Neon SQL editor)

-- 1. Add requestNumber column if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Request' AND column_name = 'requestNumber'
  ) THEN
    ALTER TABLE "Request" ADD COLUMN "requestNumber" INTEGER;
  END IF;
END $$;

-- 2. Backfill existing requests with sequential numbers if they are null
WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS seq
  FROM "Request"
)
UPDATE "Request" r
SET "requestNumber" = n.seq
FROM numbered n
WHERE r.id = n.id
  AND r."requestNumber" IS NULL;

-- 3. Ensure uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS "Request_requestNumber_key" ON "Request" ("requestNumber");


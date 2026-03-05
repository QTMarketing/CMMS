-- Migration: Add assignedToUserId field to WorkOrder and backfill from existing vendor-based assignments.
-- This migration ONLY touches the WorkOrder table. It does NOT modify or reset
-- Vendors, Assets, InventoryItems (parts), Stores, or any location data.

-- 1) Add the new nullable column for user-based assignment.
ALTER TABLE "WorkOrder"
ADD COLUMN IF NOT EXISTS "assignedToUserId" TEXT;

-- 2) Add a foreign key constraint to the User table (on delete, just null out the assignment).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   information_schema.table_constraints
    WHERE  table_name = 'WorkOrder'
    AND    constraint_name = 'WorkOrder_assignedToUserId_fkey'
  ) THEN
    ALTER TABLE "WorkOrder"
    ADD CONSTRAINT "WorkOrder_assignedToUserId_fkey"
    FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

-- 3) Backfill: For any existing work order that is assigned to a vendor,
--    set assignedToUserId to the id of a User whose vendorId matches.
--    This preserves existing assignments where you already created logins
--    for vendors/backoffice staff.
UPDATE "WorkOrder" w
SET "assignedToUserId" = u.id
FROM "User" u
WHERE w."assignedToId" IS NOT NULL
  AND u."vendorId" = w."assignedToId"
  AND w."assignedToUserId" IS NULL;


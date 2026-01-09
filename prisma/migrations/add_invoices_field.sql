-- Add invoices field to WorkOrder table
-- This field stores an array of file URLs for invoices (PDF, JPEG, Excel files)

ALTER TABLE "WorkOrder" 
ADD COLUMN IF NOT EXISTS "invoices" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add a comment to document the field
COMMENT ON COLUMN "WorkOrder"."invoices" IS 'Array of file URLs for invoices (PDF, JPEG, Excel files)';





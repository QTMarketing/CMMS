-- Add serviceOn and note to Vendor for admin-entered vendor details
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "serviceOn" TEXT;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "note" TEXT;

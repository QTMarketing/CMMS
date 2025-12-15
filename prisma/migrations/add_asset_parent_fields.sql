-- Add parent asset fields to Asset table
-- This migration adds parentAssetIdNumber and parentAssetName fields for better filtering and sorting

ALTER TABLE "Asset" 
ADD COLUMN IF NOT EXISTS "parentAssetIdNumber" INTEGER,
ADD COLUMN IF NOT EXISTS "parentAssetName" TEXT;

-- Create an index on parentAssetIdNumber for faster filtering
CREATE INDEX IF NOT EXISTS "Asset_parentAssetIdNumber_idx" ON "Asset"("parentAssetIdNumber");

-- Create an index on parentAssetName for faster filtering and sorting
CREATE INDEX IF NOT EXISTS "Asset_parentAssetName_idx" ON "Asset"("parentAssetName");

-- Create an index on category for faster filtering
CREATE INDEX IF NOT EXISTS "Asset_category_idx" ON "Asset"("category");

-- Create an index on make for faster filtering
CREATE INDEX IF NOT EXISTS "Asset_make_idx" ON "Asset"("make");

-- Create an index on model for faster filtering
CREATE INDEX IF NOT EXISTS "Asset_model_idx" ON "Asset"("model");


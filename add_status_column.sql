-- Add status column to Technician table
-- Run this SQL directly in your database (via pgAdmin, DBeaver, or your database admin tool)

ALTER TABLE "Technician" 
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'offline';

-- Optional: Add a check constraint to ensure only valid status values
-- ALTER TABLE "Technician"
-- ADD CONSTRAINT "Technician_status_check" 
-- CHECK ("status" IN ('offline', 'online', 'work_assigned'));


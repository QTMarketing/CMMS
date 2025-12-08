-- Add status column to Technician table
-- This migration adds a status field to track technician availability

ALTER TABLE "Technician" 
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'offline';

-- Add a check constraint to ensure only valid status values
ALTER TABLE "Technician"
ADD CONSTRAINT IF NOT EXISTS "Technician_status_check" 
CHECK ("status" IN ('offline', 'online', 'work_assigned'));


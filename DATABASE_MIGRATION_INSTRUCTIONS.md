# Database Migration Instructions

## Issue
The `status` column is missing from the `Technician` table in your database. This is causing the error: "Unknown field 'status' for select statement on model 'Technician'".

## Solution

You need to add the `status` column to your database. Here are two ways to do this:

### Option 1: Run SQL Directly (Recommended)

1. Connect to your database using your preferred tool (pgAdmin, DBeaver, Neon Console, etc.)
2. Run this SQL command:

```sql
ALTER TABLE "Technician" 
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'offline';
```

3. After running the SQL, restart your Next.js development server.

### Option 2: Use Prisma CLI (if database connection works)

If your database connection is working, you can run:

```bash
npx prisma db push
```

This will sync your Prisma schema with the database.

## Verification

After adding the column, you can verify it exists by running:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'Technician' AND column_name = 'status';
```

You should see the `status` column with a default value of `'offline'`.

## Notes

- The `status` field accepts three values: `'offline'`, `'online'`, or `'work_assigned'`
- All existing technicians will default to `'offline'` status
- After adding the column, the status toggle feature will work correctly


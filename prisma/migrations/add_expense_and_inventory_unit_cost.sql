-- Migration: Add unitCost to InventoryItem and create Expense table

-- 1) Add unitCost column to InventoryItem (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'InventoryItem'
      AND column_name = 'unitCost'
  ) THEN
    ALTER TABLE "InventoryItem"
      ADD COLUMN "unitCost" DECIMAL(10,2);
  END IF;
END $$;

-- 2) Create Expense table if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'Expense'
  ) THEN
    CREATE TABLE "Expense" (
      "id" TEXT NOT NULL,
      "workOrderId" TEXT,
      "storeId" TEXT NOT NULL,
      "partId" TEXT,
      "description" TEXT NOT NULL,
      "amount" DECIMAL(10,2) NOT NULL,
      "category" TEXT,
      "invoiceUrl" TEXT,
      "invoiceKey" TEXT,
      "invoiceType" TEXT,
      "uploadedAt" TIMESTAMP(3),
      "createdById" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
    );

    -- Foreign keys
    ALTER TABLE "Expense"
      ADD CONSTRAINT "Expense_workOrderId_fkey"
      FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;

    ALTER TABLE "Expense"
      ADD CONSTRAINT "Expense_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;

    ALTER TABLE "Expense"
      ADD CONSTRAINT "Expense_partId_fkey"
      FOREIGN KEY ("partId") REFERENCES "InventoryItem"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;

    ALTER TABLE "Expense"
      ADD CONSTRAINT "Expense_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;


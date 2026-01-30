-- Migration: Add PurchaseOrder and PurchaseOrderItem models

-- Create PurchaseOrder table
CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  "id" TEXT PRIMARY KEY,
  "assetId" INTEGER,
  "poNumber" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "vendorName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Draft',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "neededBy" TIMESTAMPTZ,
  "receivedAt" TIMESTAMPTZ,
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "storeId" TEXT,
  CONSTRAINT "PurchaseOrder_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create PurchaseItem table
CREATE TABLE IF NOT EXISTS "PurchaseItem" (
  "id" TEXT PRIMARY KEY,
  "purchaseOrderId" TEXT NOT NULL,
  "inventoryItemId" TEXT,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "lineTotal" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "PurchaseItem_purchaseOrderId_fkey"
    REFERENCES "PurchaseOrder" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PurchaseItem_inventoryItemId_fkey"
    REFERENCES "InventoryItem" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
);


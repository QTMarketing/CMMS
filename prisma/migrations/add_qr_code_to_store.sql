-- Add qrCode column to Store table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Store' AND column_name = 'qrCode'
    ) THEN
        ALTER TABLE "Store" ADD COLUMN "qrCode" TEXT;
    END IF;
END $$;

-- Create unique index for qrCode if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'Store_qrCode_key'
    ) THEN
        CREATE UNIQUE INDEX "Store_qrCode_key" ON "Store"("qrCode");
    END IF;
END $$;


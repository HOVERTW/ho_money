-- Add soft delete columns to support deletion tracking
-- This script adds is_deleted and deleted_at columns to relevant tables

-- Add soft delete columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add soft delete columns to assets table
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add soft delete columns to liabilities table
ALTER TABLE liabilities 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add soft delete columns to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for soft delete queries
CREATE INDEX IF NOT EXISTS idx_transactions_is_deleted ON transactions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_assets_is_deleted ON assets(is_deleted);
CREATE INDEX IF NOT EXISTS idx_liabilities_is_deleted ON liabilities(is_deleted);
CREATE INDEX IF NOT EXISTS idx_categories_is_deleted ON categories(is_deleted);

-- Create function to handle soft delete
CREATE OR REPLACE FUNCTION soft_delete_record()
RETURNS TRIGGER AS $$
BEGIN
    NEW.is_deleted = TRUE;
    NEW.deleted_at = NOW();
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create view for active (non-deleted) records
CREATE OR REPLACE VIEW active_transactions AS
SELECT * FROM transactions WHERE is_deleted = FALSE OR is_deleted IS NULL;

CREATE OR REPLACE VIEW active_assets AS
SELECT * FROM assets WHERE is_deleted = FALSE OR is_deleted IS NULL;

CREATE OR REPLACE VIEW active_liabilities AS
SELECT * FROM liabilities WHERE is_deleted = FALSE OR is_deleted IS NULL;

CREATE OR REPLACE VIEW active_categories AS
SELECT * FROM categories WHERE is_deleted = FALSE OR is_deleted IS NULL;

-- Grant permissions on views
GRANT SELECT ON active_transactions TO anon, authenticated;
GRANT SELECT ON active_assets TO anon, authenticated;
GRANT SELECT ON active_liabilities TO anon, authenticated;
GRANT SELECT ON active_categories TO anon, authenticated;

SELECT 'Soft delete columns and views created successfully!' as status;

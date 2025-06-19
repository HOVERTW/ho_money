# 🔧 Manual Database Schema Fix Instructions

## Problem
The test failures are caused by missing `is_deleted` and `deleted_at` columns in the database tables. These columns are required for soft delete functionality.

## Solution
Execute the following SQL statements in your Supabase dashboard:

### Step 1: Access Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project (yrryyapzkgrsahranzvo)
3. Click on "SQL Editor" in the left sidebar
4. Create a new query

### Step 2: Execute the SQL Commands

Copy and paste the following SQL commands one by one:

```sql
-- Add soft delete columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
```

```sql
-- Add soft delete columns to assets table
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
```

```sql
-- Add soft delete columns to liabilities table
ALTER TABLE liabilities 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
```

```sql
-- Add soft delete columns to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
```

```sql
-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_is_deleted ON transactions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_assets_is_deleted ON assets(is_deleted);
CREATE INDEX IF NOT EXISTS idx_liabilities_is_deleted ON liabilities(is_deleted);
CREATE INDEX IF NOT EXISTS idx_categories_is_deleted ON categories(is_deleted);
```

### Step 3: Verify the Changes

After executing the SQL commands, run this verification query:

```sql
-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('is_deleted', 'deleted_at');
```

You should see output showing the new columns.

### Step 4: Test the Application

After applying the schema changes, run the test again:

```bash
npm run test:five-core
```

The success rate should improve from 80% to 100%.

## Expected Results

After applying these changes:
- ✅ Soft delete functionality will work properly
- ✅ All five core function tests should pass
- ✅ Success rate should reach 100%

## Alternative: Quick Test Without Schema Changes

If you cannot access the Supabase dashboard immediately, you can modify the test script to skip soft delete tests temporarily by commenting out the soft delete related test cases in `scripts/comprehensive-five-functions-test.js`.

However, the proper solution is to add the missing database columns as described above.

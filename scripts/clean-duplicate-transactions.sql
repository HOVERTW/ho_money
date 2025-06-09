-- 檢查 transactions 表中的重複資料
-- 1. 查看重複資料統計
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT (amount, category, date, description, type, account)) as unique_records,
  COUNT(*) - COUNT(DISTINCT (amount, category, date, description, type, account)) as duplicate_count
FROM transactions;

-- 2. 查看具體的重複資料
SELECT 
  amount, 
  category, 
  date, 
  description, 
  type, 
  account,
  COUNT(*) as duplicate_count
FROM transactions 
GROUP BY amount, category, date, description, type, account
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, amount DESC
LIMIT 20;

-- 3. 查看無效資料 (type 為 undefined 或 null)
SELECT 
  COUNT(*) as invalid_type_count
FROM transactions 
WHERE type IS NULL OR type = 'undefined' OR type = '';

-- 4. 查看所有無效資料的詳細信息
SELECT 
  id,
  amount,
  category,
  date,
  description,
  type,
  account,
  created_at
FROM transactions 
WHERE type IS NULL OR type = 'undefined' OR type = ''
ORDER BY created_at DESC
LIMIT 50;

-- 5. 刪除無效資料 (type 為 undefined 或 null)
DELETE FROM transactions 
WHERE type IS NULL OR type = 'undefined' OR type = '';

-- 6. 刪除重複資料，保留最新的記錄
WITH duplicate_records AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY amount, category, date, description, type, account 
      ORDER BY created_at DESC
    ) as row_num
  FROM transactions
)
DELETE FROM transactions 
WHERE id IN (
  SELECT id 
  FROM duplicate_records 
  WHERE row_num > 1
);

-- 7. 驗證清理結果
SELECT 
  COUNT(*) as remaining_records,
  COUNT(DISTINCT (amount, category, date, description, type, account)) as unique_records
FROM transactions;

-- 8. 檢查剩餘資料的類型分布
SELECT 
  type,
  COUNT(*) as count
FROM transactions 
GROUP BY type
ORDER BY count DESC;

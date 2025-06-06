-- =====================================================
-- 簡化版台股導出查詢
-- 專門用於快速導出股票列表
-- =====================================================

-- 1. 基本統計
-- =====================================================

-- 總股票數量
SELECT COUNT(*) as total_stocks FROM taiwan_stocks;

-- 按類型統計
SELECT 
  CASE 
    WHEN code ~ '^00\d{2}$' THEN 'ETF'
    WHEN code ~ '^\d{4}$' THEN 'Stock'
    ELSE 'Other'
  END as type,
  COUNT(*) as count
FROM taiwan_stocks 
GROUP BY 1
ORDER BY count DESC;

-- 2. 代碼範圍分析
-- =====================================================

-- ETF 代碼範圍
SELECT 
  'ETF' as type,
  COUNT(*) as count,
  MIN(code) as min_code,
  MAX(code) as max_code
FROM taiwan_stocks 
WHERE code ~ '^00\d{2}$';

-- 個股代碼範圍
SELECT 
  'Stock' as type,
  COUNT(*) as count,
  MIN(code) as min_code,
  MAX(code) as max_code
FROM taiwan_stocks 
WHERE code ~ '^\d{4}$' AND NOT code ~ '^00';

-- 3. 導出股票代碼列表
-- =====================================================

-- 導出所有股票代碼（按順序）
SELECT code 
FROM taiwan_stocks 
ORDER BY 
  CASE 
    WHEN code ~ '^00\d{2}$' THEN CAST(code AS INTEGER)
    WHEN code ~ '^\d{4}$' THEN CAST(code AS INTEGER) + 10000
    ELSE 99999
  END;

-- 4. 導出完整股票資訊
-- =====================================================

-- 導出完整資訊（用於備份或分析）
SELECT 
  code,
  name,
  market_type,
  closing_price,
  price_date,
  updated_at
FROM taiwan_stocks 
ORDER BY 
  CASE 
    WHEN code ~ '^00\d{2}$' THEN CAST(code AS INTEGER)
    WHEN code ~ '^\d{4}$' THEN CAST(code AS INTEGER) + 10000
    ELSE 99999
  END;

-- 5. 熱門股票檢查
-- =====================================================

-- 檢查熱門 ETF 是否存在
SELECT code, name, closing_price 
FROM taiwan_stocks 
WHERE code IN ('0050', '0056', '00878', '00929', '00939', '00940')
ORDER BY code;

-- 6. 分批處理計算
-- =====================================================

-- 計算 5 批次的分批參數
WITH stock_count AS (
  SELECT COUNT(*) as total FROM taiwan_stocks
)
SELECT 
  total as total_stocks,
  CEIL(total / 5.0) as stocks_per_batch,
  CEIL(total * 0.2 / 60.0) as estimated_minutes_total
FROM stock_count;

-- 7. 生成批次範圍
-- =====================================================

-- 批次 1 股票列表
WITH ordered_stocks AS (
  SELECT 
    code,
    ROW_NUMBER() OVER (ORDER BY 
      CASE 
        WHEN code ~ '^00\d{2}$' THEN CAST(code AS INTEGER)
        WHEN code ~ '^\d{4}$' THEN CAST(code AS INTEGER) + 10000
        ELSE 99999
      END
    ) as row_num
  FROM taiwan_stocks
),
batch_size AS (
  SELECT CEIL(COUNT(*) / 5.0) as size FROM taiwan_stocks
)
SELECT code
FROM ordered_stocks, batch_size
WHERE row_num BETWEEN 1 AND size
ORDER BY row_num;

-- 批次 2 股票列表
WITH ordered_stocks AS (
  SELECT 
    code,
    ROW_NUMBER() OVER (ORDER BY 
      CASE 
        WHEN code ~ '^00\d{2}$' THEN CAST(code AS INTEGER)
        WHEN code ~ '^\d{4}$' THEN CAST(code AS INTEGER) + 10000
        ELSE 99999
      END
    ) as row_num
  FROM taiwan_stocks
),
batch_size AS (
  SELECT CEIL(COUNT(*) / 5.0) as size FROM taiwan_stocks
)
SELECT code
FROM ordered_stocks, batch_size
WHERE row_num BETWEEN (size + 1) AND (size * 2)
ORDER BY row_num;

-- 8. 資料品質檢查
-- =====================================================

-- 檢查缺少資料的股票
SELECT 
  'Missing Price' as issue,
  COUNT(*) as count
FROM taiwan_stocks 
WHERE closing_price IS NULL OR closing_price <= 0
UNION ALL
SELECT 
  'Missing Name' as issue,
  COUNT(*) as count
FROM taiwan_stocks 
WHERE name IS NULL OR name = ''
UNION ALL
SELECT 
  'Missing Date' as issue,
  COUNT(*) as count
FROM taiwan_stocks 
WHERE price_date IS NULL;

-- 檢查重複代碼
SELECT code, COUNT(*) as duplicate_count
FROM taiwan_stocks 
GROUP BY code 
HAVING COUNT(*) > 1;

-- =====================================================
-- 使用說明：
-- 1. 複製需要的查詢到 Supabase SQL Editor
-- 2. 執行查詢獲取結果
-- 3. 將結果用於更新腳本
-- =====================================================

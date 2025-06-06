-- =====================================================
-- 台股資料表查詢 SQL 集合
-- 用於分析和導出 Supabase taiwan_stocks 資料表
-- =====================================================

-- 1. 基本統計查詢
-- =====================================================

-- 總股票數量
SELECT COUNT(*) as total_stocks 
FROM taiwan_stocks;

-- 按市場類型統計
SELECT 
  market_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM taiwan_stocks), 2) as percentage
FROM taiwan_stocks 
GROUP BY market_type 
ORDER BY count DESC;

-- 最近更新統計
SELECT 
  price_date,
  COUNT(*) as stocks_updated
FROM taiwan_stocks 
WHERE price_date IS NOT NULL
GROUP BY price_date 
ORDER BY price_date DESC 
LIMIT 10;

-- 2. 股票代碼分析
-- =====================================================

-- ETF 統計 (00xx 格式)
SELECT 
  'ETF' as type,
  COUNT(*) as count,
  MIN(code) as min_code,
  MAX(code) as max_code
FROM taiwan_stocks 
WHERE code ~ '^00\d{2}$';

-- 個股統計 (4位數字)
SELECT 
  'Stock' as type,
  COUNT(*) as count,
  MIN(code) as min_code,
  MAX(code) as max_code
FROM taiwan_stocks 
WHERE code ~ '^\d{4}$' AND NOT code ~ '^00';

-- 其他格式統計
SELECT 
  'Other' as type,
  COUNT(*) as count,
  array_agg(DISTINCT code ORDER BY code) as sample_codes
FROM taiwan_stocks 
WHERE NOT (code ~ '^00\d{2}$' OR code ~ '^\d{4}$');

-- 3. 詳細代碼範圍分析
-- =====================================================

-- ETF 代碼詳細分析
SELECT 
  'ETF代碼範圍' as analysis,
  COUNT(*) as total_etfs,
  MIN(CAST(code AS INTEGER)) as min_code_num,
  MAX(CAST(code AS INTEGER)) as max_code_num,
  string_agg(code, ', ' ORDER BY code) as sample_codes
FROM taiwan_stocks 
WHERE code ~ '^00\d{2}$'
LIMIT 1;

-- 個股代碼按千位數分組
SELECT 
  CASE 
    WHEN CAST(code AS INTEGER) BETWEEN 1000 AND 1999 THEN '1000-1999'
    WHEN CAST(code AS INTEGER) BETWEEN 2000 AND 2999 THEN '2000-2999'
    WHEN CAST(code AS INTEGER) BETWEEN 3000 AND 3999 THEN '3000-3999'
    WHEN CAST(code AS INTEGER) BETWEEN 4000 AND 4999 THEN '4000-4999'
    WHEN CAST(code AS INTEGER) BETWEEN 5000 AND 5999 THEN '5000-5999'
    WHEN CAST(code AS INTEGER) BETWEEN 6000 AND 6999 THEN '6000-6999'
    WHEN CAST(code AS INTEGER) BETWEEN 7000 AND 7999 THEN '7000-7999'
    WHEN CAST(code AS INTEGER) BETWEEN 8000 AND 8999 THEN '8000-8999'
    WHEN CAST(code AS INTEGER) BETWEEN 9000 AND 9999 THEN '9000-9999'
    ELSE 'Other'
  END as code_range,
  COUNT(*) as count
FROM taiwan_stocks 
WHERE code ~ '^\d{4}$' AND NOT code ~ '^00'
GROUP BY 1
ORDER BY 1;

-- 4. 導出查詢
-- =====================================================

-- 導出所有股票代碼 (按代碼排序)
SELECT code 
FROM taiwan_stocks 
ORDER BY 
  CASE 
    WHEN code ~ '^00\d{2}$' THEN CAST(code AS INTEGER)
    WHEN code ~ '^\d{4}$' THEN CAST(code AS INTEGER) + 10000
    ELSE 99999
  END;

-- 導出完整股票資訊
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

-- 5. 熱門股票查詢
-- =====================================================

-- 熱門 ETF (按代碼)
SELECT code, name, closing_price, price_date
FROM taiwan_stocks 
WHERE code IN ('0050', '0056', '00878', '00929', '00939', '00940')
ORDER BY code;

-- 價格最高的前 20 支股票
SELECT code, name, closing_price, market_type
FROM taiwan_stocks 
WHERE closing_price IS NOT NULL AND closing_price > 0
ORDER BY closing_price DESC 
LIMIT 20;

-- 最近更新的股票
SELECT code, name, closing_price, price_date, updated_at
FROM taiwan_stocks 
WHERE updated_at IS NOT NULL
ORDER BY updated_at DESC 
LIMIT 20;

-- 6. 資料品質檢查
-- =====================================================

-- 缺少價格的股票
SELECT COUNT(*) as stocks_without_price
FROM taiwan_stocks 
WHERE closing_price IS NULL OR closing_price <= 0;

-- 缺少名稱的股票
SELECT COUNT(*) as stocks_without_name
FROM taiwan_stocks 
WHERE name IS NULL OR name = '';

-- 缺少更新日期的股票
SELECT COUNT(*) as stocks_without_date
FROM taiwan_stocks 
WHERE price_date IS NULL;

-- 重複代碼檢查
SELECT code, COUNT(*) as duplicate_count
FROM taiwan_stocks 
GROUP BY code 
HAVING COUNT(*) > 1;

-- 7. 分批處理查詢
-- =====================================================

-- 計算分批處理參數 (5 批次)
WITH stock_stats AS (
  SELECT COUNT(*) as total_stocks FROM taiwan_stocks
)
SELECT 
  total_stocks,
  CEIL(total_stocks / 5.0) as stocks_per_batch,
  CEIL(total_stocks * 0.2 / 60.0) as estimated_minutes
FROM stock_stats;

-- 分批次股票列表 (範例：批次 1)
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
batch_params AS (
  SELECT CEIL(COUNT(*) / 5.0) as batch_size FROM taiwan_stocks
)
SELECT code
FROM ordered_stocks, batch_params
WHERE row_num BETWEEN 1 AND batch_size
ORDER BY row_num;

-- 8. 匯出用 SQL
-- =====================================================

-- 生成 JavaScript 陣列格式
SELECT 
  'const TAIWAN_STOCKS_CODES = [' as line
UNION ALL
SELECT 
  '  ''' || code || ''',' as line
FROM taiwan_stocks 
ORDER BY 
  CASE 
    WHEN code ~ '^00\d{2}$' THEN CAST(code AS INTEGER)
    WHEN code ~ '^\d{4}$' THEN CAST(code AS INTEGER) + 10000
    ELSE 99999
  END
UNION ALL
SELECT '];' as line;

-- 生成 CSV 格式
COPY (
  SELECT code, name, market_type, closing_price, price_date
  FROM taiwan_stocks 
  ORDER BY 
    CASE 
      WHEN code ~ '^00\d{2}$' THEN CAST(code AS INTEGER)
      WHEN code ~ '^\d{4}$' THEN CAST(code AS INTEGER) + 10000
      ELSE 99999
    END
) TO '/tmp/taiwan_stocks_export.csv' WITH CSV HEADER;

-- =====================================================
-- 使用說明：
-- 1. 在 Supabase SQL Editor 中執行這些查詢
-- 2. 或使用 psql 連接到資料庫執行
-- 3. 根據結果調整更新腳本的股票列表
-- =====================================================

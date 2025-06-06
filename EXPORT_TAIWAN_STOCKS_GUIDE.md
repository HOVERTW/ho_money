# 📊 台股列表導出指南

## 🎯 目的

直接從 Supabase `taiwan_stocks` 資料表導出現有股票列表，避免生成不必要的股票代碼，確保更新腳本只處理實際存在的股票。

## 🚀 快速執行

### 方法 1：使用 Node.js 腳本（推薦）

```bash
# 1. 確保環境變數已設定
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# 2. 執行導出腳本
node run-export.js
```

### 方法 2：使用 Supabase SQL Editor

1. 登入 Supabase Dashboard
2. 進入 SQL Editor
3. 複製 `taiwan_stocks_queries.sql` 中的查詢
4. 執行所需的查詢

## 📋 生成的檔案

執行後會生成以下檔案：

### 1. `taiwan_stocks_export.json`
```json
{
  "export_date": "2025-06-06T...",
  "total_count": 1234,
  "stocks": [
    {
      "code": "0050",
      "name": "元大台灣50",
      "market_type": "TSE",
      "closing_price": 142.50,
      "price_date": "2025-06-06"
    }
  ]
}
```

### 2. `taiwan_stocks_codes.txt`
```
0050
0056
1101
1102
...
```

### 3. `taiwan_stocks_codes.js`
```javascript
const TAIWAN_STOCKS_CODES = [
  '0050',
  '0056',
  '1101',
  '1102',
  // ...
];

module.exports = TAIWAN_STOCKS_CODES;
```

### 4. `taiwan_stocks_export.sql`
```sql
INSERT INTO taiwan_stocks (code, name, market_type, closing_price, price_date) VALUES
('0050', '元大台灣50', 'TSE', 142.50, '2025-06-06'),
('0056', '元大高股息', 'TSE', 35.20, '2025-06-06'),
-- ...
```

## 📊 分析報告

腳本會自動分析股票代碼分布：

```
📈 股票代碼分析:
==================
📊 ETF (00xx): 45 支
📊 個股 (xxxx): 1189 支
📊 其他格式: 0 支
   ETF 範圍: 0050 - 0940
   ETF 範例: 0050, 0051, 0052, 0053, 0054...
   個股範圍: 1101 - 9962
   個股範例: 1101, 1102, 1103, 1104, 1108...
```

## 🔧 更新腳本修正

### 方案 1：直接使用導出的列表

修改 `scripts/update-taiwan-stocks.js`：

```javascript
// 替換現有的 generateTaiwanStockCodes() 函數
const TAIWAN_STOCKS_CODES = require('../taiwan_stocks_codes.js');

function getTaiwanStockCodes() {
  const stocks = TAIWAN_STOCKS_CODES.map(code => ({ code }));
  
  console.log(`📊 使用現有股票列表: ${stocks.length} 支`);
  return stocks;
}
```

### 方案 2：從資料庫動態獲取

```javascript
// 替換現有的 generateTaiwanStockCodes() 函數
async function getTaiwanStockCodes() {
  const { data: stocks, error } = await supabase
    .from('taiwan_stocks')
    .select('code')
    .order('code');
    
  if (error) throw error;
  
  console.log(`📊 從資料庫獲取股票列表: ${stocks.length} 支`);
  return stocks;
}
```

## 📈 優勢分析

### ✅ 使用現有列表的優勢

1. **精確性**：只處理實際存在的股票
2. **效率**：避免大量無效 API 請求
3. **速度**：減少 80% 的無效代碼處理
4. **成功率**：大幅提升更新成功率

### 📊 效果對比

```
修正前：
- 處理代碼：9162 支
- 有效股票：~1200 支 (13%)
- 無效代碼：~7962 支 (87%)
- 執行時間：40-50 分鐘

修正後：
- 處理代碼：~1200 支
- 有效股票：~1200 支 (100%)
- 無效代碼：0 支 (0%)
- 執行時間：8-12 分鐘
```

## 🔍 常用 SQL 查詢

### 基本統計
```sql
-- 總股票數
SELECT COUNT(*) FROM taiwan_stocks;

-- 按類型統計
SELECT 
  CASE 
    WHEN code ~ '^00\d{2}$' THEN 'ETF'
    WHEN code ~ '^\d{4}$' THEN 'Stock'
    ELSE 'Other'
  END as type,
  COUNT(*)
FROM taiwan_stocks 
GROUP BY 1;
```

### 代碼範圍
```sql
-- ETF 範圍
SELECT MIN(code), MAX(code) 
FROM taiwan_stocks 
WHERE code ~ '^00\d{2}$';

-- 個股範圍
SELECT MIN(CAST(code AS INTEGER)), MAX(CAST(code AS INTEGER))
FROM taiwan_stocks 
WHERE code ~ '^\d{4}$' AND NOT code ~ '^00';
```

### 導出代碼列表
```sql
-- 按順序導出所有代碼
SELECT code 
FROM taiwan_stocks 
ORDER BY 
  CASE 
    WHEN code ~ '^00\d{2}$' THEN CAST(code AS INTEGER)
    WHEN code ~ '^\d{4}$' THEN CAST(code AS INTEGER) + 10000
    ELSE 99999
  END;
```

## 🛠️ 故障排除

### 環境變數問題
```bash
# 檢查環境變數
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# 設定環境變數 (如果缺少)
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
```

### 權限問題
```
確保 SUPABASE_ANON_KEY 有讀取 taiwan_stocks 資料表的權限
```

### 網路問題
```
確保可以連接到 Supabase：
curl -I https://your-project.supabase.co
```

## 🎯 下一步建議

1. **執行導出**：`node run-export.js`
2. **檢查結果**：查看生成的檔案和分析報告
3. **更新腳本**：使用導出的列表修改更新腳本
4. **測試執行**：測試修正後的更新腳本
5. **監控效果**：比較修正前後的執行效率

## 🎉 預期效果

使用現有股票列表後：
- ✅ **執行時間大幅縮短**：40分鐘 → 10分鐘
- ✅ **成功率大幅提升**：30% → 95%+
- ✅ **API 請求減少**：減少 80% 無效請求
- ✅ **資源使用優化**：更高效的處理流程

**這是最實用和高效的解決方案！** 🚀

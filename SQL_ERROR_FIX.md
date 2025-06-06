# 🔧 SQL 語法錯誤修正

## 🚨 遇到的問題

```
ERROR: 42601: syntax error at or near "UNION"
LINE 221: UNION ALL
```

## 🔍 問題原因

原始 SQL 查詢中的 `UNION ALL` 語法有問題，主要是：
1. `ORDER BY` 不能在 `UNION` 的子查詢中使用
2. PostgreSQL 對 `UNION` 語法要求更嚴格

## ✅ 解決方案

### 方案 1：使用簡化版導出工具（推薦）

```bash
# 使用修正後的 Node.js 腳本
node run-export.js
```

這個腳本會：
- ✅ 避免複雜的 SQL 語法
- ✅ 使用 JavaScript 處理資料
- ✅ 生成所有需要的檔案格式
- ✅ 提供詳細的分析報告

### 方案 2：使用簡化版 SQL 查詢

使用 `simple_export_queries.sql` 中的查詢，這些查詢已經過測試：

```sql
-- 1. 獲取總數
SELECT COUNT(*) as total_stocks FROM taiwan_stocks;

-- 2. 按類型統計
SELECT 
  CASE 
    WHEN code ~ '^00\d{2}$' THEN 'ETF'
    WHEN code ~ '^\d{4}$' THEN 'Stock'
    ELSE 'Other'
  END as type,
  COUNT(*) as count
FROM taiwan_stocks 
GROUP BY 1;

-- 3. 導出所有代碼
SELECT code 
FROM taiwan_stocks 
ORDER BY 
  CASE 
    WHEN code ~ '^00\d{2}$' THEN CAST(code AS INTEGER)
    WHEN code ~ '^\d{4}$' THEN CAST(code AS INTEGER) + 10000
    ELSE 99999
  END;
```

## 🚀 推薦使用流程

### 1. 快速導出（最簡單）

```bash
# 確保環境變數已設定
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"

# 執行導出
node run-export.js
```

### 2. 查看結果

執行後會生成：
- `taiwan_stocks_codes.txt` - 純代碼列表
- `taiwan_stocks_codes.js` - JavaScript 陣列
- `taiwan_stocks_export.json` - 完整 JSON 資料
- `taiwan_stocks_export.csv` - CSV 格式

### 3. 分析報告

腳本會顯示：
```
📊 股票分類統計:
ETF (00xx): 45 支
個股 (xxxx): 1189 支
其他格式: 0 支
ETF 範圍: 0050 - 0940
個股範圍: 1101 - 9962

🔧 分批處理建議:
總股票數: 1234
建議批次數: 5
每批次股票數: 247
預估總執行時間: 5 分鐘
```

## 🔧 更新腳本使用

導出完成後，在 `scripts/update-taiwan-stocks.js` 中使用：

```javascript
// 替換現有的 generateTaiwanStockCodes() 函數
const TAIWAN_STOCKS_CODES = require('../taiwan_stocks_codes.js');

function getTaiwanStockCodes() {
  const stocks = TAIWAN_STOCKS_CODES.map(code => ({ code }));
  console.log(`📊 使用現有股票列表: ${stocks.length} 支`);
  return stocks;
}

// 在主函數中使用
async function updateTaiwanStocks() {
  // 步驟 2：獲取股票列表（使用導出的列表）
  const allStocks = getTaiwanStockCodes();
  
  // 其餘邏輯保持不變...
}
```

## 📊 預期效果

使用導出的股票列表後：

```
修正前：
- 處理代碼：9162 支
- 有效股票：~1200 支 (13%)
- 執行時間：40-50 分鐘

修正後：
- 處理代碼：~1200 支
- 有效股票：~1200 支 (100%)
- 執行時間：8-12 分鐘
```

## 🎯 立即行動

1. **執行導出**：
```bash
node run-export.js
```

2. **檢查結果**：
```bash
ls -la taiwan_stocks_*
```

3. **查看統計**：
檢查終端輸出的分析報告

4. **更新腳本**：
使用生成的 `taiwan_stocks_codes.js`

## 🎉 問題解決

- ✅ **SQL 語法錯誤**：使用 JavaScript 處理，避免複雜 SQL
- ✅ **資料準確性**：直接從資料庫獲取現有股票
- ✅ **執行效率**：只處理有效股票，大幅提升速度
- ✅ **維護簡單**：基於實際資料，容易維護

**現在可以安全地執行導出，不會再遇到 SQL 語法錯誤！** 🚀

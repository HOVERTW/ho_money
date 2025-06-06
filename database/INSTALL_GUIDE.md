# 🚀 台股資料庫安裝指南

## ❌ **錯誤修正**

如果您遇到這個錯誤：
```
ERROR: 42704: text search configuration "chinese" does not exist
```

**解決方案：使用新的相容版 SQL 檔案**

## ✅ **正確安裝步驟**

### **步驟 1: 使用相容版 SQL**
在 Supabase SQL Editor 中執行：
```sql
-- 使用這個檔案而不是原本的
taiwan_stocks_supabase_compatible.sql
```

### **步驟 2: 驗證安裝**
執行以下查詢確認安裝成功：
```sql
-- 檢查資料表
SELECT * FROM taiwan_stocks LIMIT 5;

-- 檢查市場統計
SELECT * FROM v_stock_summary;

-- 測試搜尋功能
SELECT * FROM search_stocks('台積', NULL, 5);
```

### **步驟 3: 檢查索引**
```sql
-- 確認索引已建立
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'taiwan_stocks';
```

## 🔧 **主要修正內容**

### **1. 移除中文全文搜尋**
```sql
-- ❌ 原本 (會出錯)
CREATE INDEX idx_taiwan_stocks_name ON taiwan_stocks 
USING gin(to_tsvector('chinese', name));

-- ✅ 修正後 (相容)
CREATE INDEX idx_taiwan_stocks_name_search ON taiwan_stocks
(name varchar_pattern_ops);
```

### **2. 優化搜尋功能**
```sql
-- 新增專用搜尋函數
CREATE FUNCTION search_stocks(
    search_term TEXT,
    market_filter market_type DEFAULT NULL,
    limit_count INTEGER DEFAULT 50
)
```

### **3. 增強索引策略**
```sql
-- 為 LIKE 查詢優化
CREATE INDEX idx_taiwan_stocks_code_search ON taiwan_stocks(code varchar_pattern_ops);
CREATE INDEX idx_taiwan_stocks_name_search ON taiwan_stocks(name varchar_pattern_ops);

-- 為排序優化
CREATE INDEX idx_taiwan_stocks_price ON taiwan_stocks(closing_price);
CREATE INDEX idx_taiwan_stocks_volume ON taiwan_stocks(volume);
CREATE INDEX idx_taiwan_stocks_change ON taiwan_stocks(change_percent);
```

## 📊 **功能測試**

### **基本查詢**
```sql
-- 獲取所有 ETF
SELECT code, name, closing_price 
FROM taiwan_stocks 
WHERE market_type = 'ETF';

-- 價格排行
SELECT code, name, closing_price 
FROM taiwan_stocks 
ORDER BY closing_price DESC 
LIMIT 10;
```

### **搜尋測試**
```sql
-- 使用新的搜尋函數
SELECT * FROM search_stocks('台積');
SELECT * FROM search_stocks('00', 'ETF');
SELECT * FROM search_stocks('鴻海', 'TSE');
```

### **統計查詢**
```sql
-- 市場統計
SELECT 
    market_type,
    stock_count,
    avg_price,
    total_volume
FROM v_stock_summary;

-- 熱門股票
SELECT * FROM v_popular_stocks LIMIT 10;

-- 漲跌幅排行
SELECT * FROM v_price_movers LIMIT 10;
```

## 🎯 **預期結果**

安裝成功後，您應該看到：

### **資料表結構**
```
taiwan_stocks
├── code (VARCHAR(10)) - 主鍵
├── name (VARCHAR(100))
├── market_type (ENUM: TSE/OTC/ETF)
├── closing_price (DECIMAL)
├── volume (BIGINT)
└── ... (其他欄位)
```

### **範例資料**
```
code  | name        | market_type | closing_price
------|-------------|-------------|---------------
2330  | 台積電      | TSE         | 967.00
0050  | 元大台灣50  | ETF         | 179.75
6488  | 環球晶      | OTC         | 168.50
```

### **索引清單**
```
idx_taiwan_stocks_market_type
idx_taiwan_stocks_price_date
idx_taiwan_stocks_code_search
idx_taiwan_stocks_name_search
idx_taiwan_stocks_price
idx_taiwan_stocks_volume
```

## 🚨 **常見問題**

### **Q: 還是出現權限錯誤？**
```sql
-- 檢查 RLS 政策
SELECT * FROM pg_policies WHERE tablename = 'taiwan_stocks';

-- 如果需要，暫時關閉 RLS
ALTER TABLE taiwan_stocks DISABLE ROW LEVEL SECURITY;
```

### **Q: 函數建立失敗？**
```sql
-- 檢查函數是否存在
SELECT proname FROM pg_proc WHERE proname LIKE '%stock%';

-- 重新建立函數
DROP FUNCTION IF EXISTS search_stocks;
-- 然後重新執行函數建立語句
```

### **Q: 視圖查詢為空？**
```sql
-- 確認有範例資料
SELECT COUNT(*) FROM taiwan_stocks;

-- 如果沒有，重新插入範例資料
INSERT INTO taiwan_stocks (code, name, market_type, closing_price, price_date) 
VALUES ('2330', '台積電', 'TSE', 967.00, CURRENT_DATE);
```

## ✅ **安裝完成檢查清單**

- [ ] ✅ 資料表 `taiwan_stocks` 建立成功
- [ ] ✅ 枚舉類型 `market_type` 建立成功  
- [ ] ✅ 所有索引建立完成 (7個)
- [ ] ✅ 觸發器 `update_updated_at_column` 運作正常
- [ ] ✅ RLS 政策設定完成
- [ ] ✅ 視圖 `v_stock_summary` 可查詢
- [ ] ✅ 函數 `search_stocks` 可執行
- [ ] ✅ 範例資料插入成功 (10筆)

## 🎉 **下一步**

安裝完成後，您可以：

1. **執行資料獲取腳本**
   ```bash
   npm run fetch-stocks
   ```

2. **在 React Native 中使用**
   ```typescript
   import { useStocks } from './hooks/useStocks';
   ```

3. **設置自動更新**
   - 配置 GitHub Actions
   - 每日自動執行

---

🎯 **現在您的 Supabase 資料庫已經準備好接收完整的台股資料了！**

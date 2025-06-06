# 台股資料庫設置與自動更新說明

## 📋 資料庫架構

### 主要特點
- ✅ **簡化設計**：只保存最新一日的股票收盤價
- ✅ **自動更新**：每日自動從台灣證交所獲取最新資料
- ✅ **高效查詢**：針對股票搜尋優化的索引設計
- ✅ **安全性**：使用 RLS (Row Level Security) 保護資料

### 資料表結構
```sql
taiwan_stocks (
  code VARCHAR(10) PRIMARY KEY,     -- 股票代號
  name VARCHAR(100) NOT NULL,       -- 股票名稱  
  closing_price DECIMAL(10,2),      -- 收盤價
  price_date DATE NOT NULL,         -- 價格日期
  created_at TIMESTAMP,             -- 建立時間
  updated_at TIMESTAMP              -- 更新時間
)
```

## 🚀 設置步驟

### 1. 建立資料庫
在 Supabase SQL Editor 中執行：
```bash
# 執行 SQL 腳本
cat taiwan_stocks_schema.sql | supabase db reset
```

### 2. 設置環境變數
在 GitHub Secrets 中添加：
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. 啟用 GitHub Actions
- 將代碼推送到 GitHub
- GitHub Actions 會自動每日更新股票資料

## 📡 API 使用方式

### 搜尋股票
```sql
-- 搜尋代號或名稱包含 "233" 的股票
SELECT * FROM search_stocks('233');

-- 結果：
-- code | name | closing_price | price_date
-- 2330 | 台積電 | 1000.00 | 2024-12-30
-- 2337 | 旺宏 | 45.50 | 2024-12-30
```

### 獲取特定股票
```sql
-- 獲取台積電資料
SELECT * FROM get_stock_by_code('2330');
```

### 列出所有股票
```sql
-- 按代號排序列出所有股票
SELECT * FROM taiwan_stocks ORDER BY code;
```

## 🔄 自動更新機制

### GitHub Actions 排程
- **執行時間**：每日台北時間下午 6:00
- **執行日期**：週一到週五（交易日）
- **手動觸發**：支援手動執行更新

### 更新流程
1. 📡 從台灣證交所 API 獲取最新資料
2. 🔄 處理和驗證資料格式
3. 💾 批量更新 Supabase 資料庫
4. 🧹 清理超過 7 天的舊資料

### 資料來源
- **API**：台灣證交所公開資料
- **端點**：`https://www.twse.com.tw/exchangeReport/STOCK_DAY_AVG_ALL`
- **格式**：JSON 格式的每日收盤價資料

## 🛠️ 本地開發

### 手動執行更新
```bash
# 安裝依賴
npm install @supabase/supabase-js

# 設置環境變數
export SUPABASE_URL=your_supabase_url
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 執行更新
node database/daily_stock_update.js
```

### 測試搜尋功能
```javascript
// 在 React Native 應用中
import { supabase } from '../services/supabase';

// 搜尋股票
const searchStocks = async (query) => {
  const { data, error } = await supabase.rpc('search_stocks', {
    search_term: query
  });
  return data;
};

// 使用範例
const results = await searchStocks('2330');
console.log(results); // [{ code: '2330', name: '台積電', ... }]
```

## 📊 監控與維護

### 查看更新狀態
```sql
-- 檢查最新更新時間
SELECT MAX(updated_at) as last_update FROM taiwan_stocks;

-- 檢查資料筆數
SELECT COUNT(*) as total_stocks FROM taiwan_stocks;

-- 檢查今日是否有資料
SELECT COUNT(*) as today_data 
FROM taiwan_stocks 
WHERE price_date = CURRENT_DATE;
```

### 手動清理資料
```sql
-- 清理超過 7 天的舊資料
SELECT cleanup_old_stock_data();
```

## 🔧 故障排除

### 常見問題

1. **GitHub Actions 執行失敗**
   - 檢查 Secrets 是否正確設置
   - 確認 Supabase Service Role Key 權限

2. **API 無回應**
   - 台灣證交所 API 可能暫時無法使用
   - 檢查網路連接和 API 端點

3. **資料格式錯誤**
   - 台灣證交所可能更改 API 格式
   - 需要更新資料處理邏輯

### 日誌查看
- GitHub Actions：在 Actions 頁面查看執行日誌
- Supabase：在 Dashboard 的 Logs 頁面查看資料庫日誌

## 📈 效能優化

### 索引策略
- `code`：主鍵索引（自動）
- `name`：名稱搜尋索引
- `price_date`：日期查詢索引
- `(code, name)`：複合搜尋索引

### 查詢優化
- 使用 `ILIKE` 進行模糊搜尋
- 限制搜尋結果數量（預設 20 筆）
- 優先顯示代號完全匹配的結果

## 🔐 安全性

### RLS 政策
- **讀取**：允許所有人讀取股票資料
- **寫入**：只允許 Service Role 寫入資料

### API 保護
- 使用 Service Role Key 進行資料庫操作
- GitHub Secrets 保護敏感資訊
- 函數使用 `SECURITY DEFINER` 確保權限控制

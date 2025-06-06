# 🚀 台股 JSON API 資料設置指南

## 📋 快速設置步驟

### 1. 在 Supabase 中執行 SQL
1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. 前往 **SQL Editor**
4. 複製並執行 `taiwan_stocks_schema.sql` 的完整內容

### 2. 設置環境變數
在您的 `.env` 文件中確認以下變數：
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. 立即獲取真實台股資料
執行以下命令來獲取最新的台股資料：

```bash
# 安裝依賴
npm install @supabase/supabase-js

# 執行 JSON API 獲取腳本
node database/fetch_json_stock_data.js
```

## 📊 API 資料格式

### 台灣證交所 JSON API
- **端點**: `https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_AVG_ALL`
- **方法**: GET
- **格式**: JSON
- **內容**: 所有上市股票的最新收盤價和月平均價

### JSON 資料結構
```json
[
  {
    "Date": "20241230",
    "Code": "2330",
    "Name": "台積電",
    "ClosingPrice": "1000.00",
    "MonthlyAveragePrice": "980.50"
  },
  {
    "Date": "20241230", 
    "Code": "2317",
    "Name": "鴻海",
    "ClosingPrice": "180.50",
    "MonthlyAveragePrice": "175.20"
  }
]
```

## 🎯 預期執行結果

執行成功後，您將看到類似以下的輸出：

```
🚀 開始獲取並更新最新台股資料...
⏰ 開始時間: 2024/12/30 下午6:00:00
🌐 使用台灣證交所官方 JSON API
📡 API 端點: https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_AVG_ALL
✅ 成功獲取 JSON 資料，共 1000+ 筆記錄
📅 資料最後更新時間: Thu, 29 May 2025 21:20:39 GMT
🔄 開始處理 JSON 股票資料...
✅ 成功處理 900+ 筆有效股票資料
📅 最新交易日期: 20241230
💾 準備批量更新 900+ 筆股票資料到資料庫...
📦 更新第 1/18 批，共 50 筆資料...
✅ 第 1 批更新完成: 50 筆
📦 更新第 2/18 批，共 50 筆資料...
✅ 第 2 批更新完成: 50 筆
...
🎉 批量更新完成！
📊 成功: 900+ 筆，失敗: 0 筆
🔍 驗證資料庫更新結果...
📊 資料庫中股票總數: 900+
📅 最新資料日期: 2024-12-30
⏰ 最後更新時間: 2024-12-30T18:05:00.000Z

📋 最新更新的股票範例:
  2330 台積電: NT$1000
  2317 鴻海: NT$180.5
  2454 聯發科: NT$1200
  2412 中華電: NT$120.5
  2308 台達電: NT$350

🎉 台股資料更新完成！
📊 更新統計: 成功 900+ 筆，失敗 0 筆
📅 資料日期: 20241230
⏱️ 執行時間: 15 秒
⏰ 完成時間: 2024/12/30 下午6:00:15
📈 成功率: 100.0%
```

## 🔍 驗證資料

### 在 Supabase 中查詢
```sql
-- 檢查總股票數量
SELECT COUNT(*) as total_stocks FROM taiwan_stocks;

-- 查看最新更新時間
SELECT MAX(updated_at) as last_update FROM taiwan_stocks;

-- 查看範例股票
SELECT * FROM taiwan_stocks ORDER BY code LIMIT 10;

-- 搜尋台積電
SELECT * FROM search_stocks('2330');

-- 搜尋所有2開頭的股票
SELECT * FROM search_stocks('2');
```

### 在應用程式中測試
1. 重新啟動 React Native 應用程式
2. 前往「資產負債」→「新增資產」→「台股」
3. 在股票搜尋欄位測試：
   - 輸入 `2` → 顯示所有 2 開頭的股票
   - 輸入 `2330` → 顯示台積電
   - 輸入 `台積` → 顯示台積電

## 🔄 自動更新設置

### GitHub Actions（推薦）
1. 將代碼推送到 GitHub
2. 在 GitHub Repository Settings → Secrets 中添加：
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
3. GitHub Actions 會每日台北時間下午 6:00 自動更新

### 手動更新
隨時可以執行以下命令來手動更新：
```bash
node database/fetch_json_stock_data.js
```

## 📈 資料特點

### ✅ **優勢**
- **JSON 格式**：結構化資料，易於處理
- **官方 API**：台灣證交所官方提供
- **最新資料**：包含最新交易日的收盤價
- **月平均價**：額外提供月平均價資訊
- **批量更新**：高效的資料庫更新機制
- **錯誤處理**：完整的錯誤處理和重試機制

### 📊 **資料內容**
- **股票數量**：900+ 檔上市股票
- **更新頻率**：每日收盤後更新
- **資料欄位**：日期、代號、名稱、收盤價、月平均價
- **資料品質**：官方資料，準確可靠

## 🛠️ 故障排除

### 常見問題

1. **API 無回應**
   - 檢查網路連接
   - 確認台灣證交所 API 是否正常運作
   - 檢查 API 端點是否正確

2. **JSON 解析失敗**
   - 檢查 API 回應格式
   - 確認 Accept 標頭設置正確

3. **資料庫連接失敗**
   - 檢查 Supabase URL 和 Service Role Key
   - 確認 RLS 政策已正確設置
   - 檢查資料庫函數是否存在

4. **批量更新失敗**
   - 檢查資料格式是否正確
   - 確認資料庫函數參數匹配
   - 查看 Supabase 日誌

### 日誌分析
腳本提供詳細的執行日誌：
- ✅ 成功操作用綠色勾號
- ❌ 錯誤操作用紅色叉號
- ⚠️ 警告訊息用黃色驚嘆號
- 📊 統計資訊用圖表符號

## 🎯 下一步

資料設置完成後，您的股票搜尋功能將擁有：
- ✅ **900+ 檔台股**的最新收盤價
- ✅ **完整的股票名稱**和代號
- ✅ **月平均價**資訊
- ✅ **每日自動更新**機制
- ✅ **高效的搜尋功能**

現在您可以在應用程式中享受完整的台股搜尋體驗！🎉

# 🚀 設置真實台股資料

## 📋 快速設置步驟

### 1. 在 Supabase 中執行 SQL
1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. 前往 **SQL Editor**
4. 複製並執行 `taiwan_stocks_schema.sql` 的內容

### 2. 設置環境變數
在您的 `.env` 文件中確認以下變數：
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. 立即獲取真實資料
執行以下命令來獲取最新的台股資料：

```bash
# 安裝依賴
npm install @supabase/supabase-js node-fetch

# 執行獲取腳本
node database/fetch_real_data.js
```

## 📊 預期結果

執行成功後，您將看到類似以下的輸出：

```
🚀 開始獲取並更新真實台股資料...
⏰ 開始時間: 2024/12/30 下午6:00:00
📅 目標日期: 20241230
📊 API 回應狀態: OK
✅ 成功獲取 1000+ 筆原始資料
🔄 開始處理 1000+ 筆原始資料...
✅ 成功處理 900+ 筆有效股票資料
💾 準備更新 900+ 筆股票資料到資料庫...
📦 更新第 1 批，共 100 筆資料...
✅ 第 1 批更新完成
...
🎉 資料庫更新完成，共更新 900+ 筆股票資料
🎉 真實台股資料更新完成！
📊 更新統計: 900+ 筆股票資料
📅 資料日期: 2024-12-30
⏰ 完成時間: 2024/12/30 下午6:05:00

📋 範例股票資料:
  1101 台泥: NT$45.50
  1102 亞泥: NT$52.30
  1216 統一: NT$78.90
  1301 台塑: NT$95.80
  1303 南亞: NT$78.60
  2002 中鋼: NT$32.15
  2308 台達電: NT$350.00
  2317 鴻海: NT$180.50
  2330 台積電: NT$1000.00
  2454 聯發科: NT$1200.00
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

-- 搜尋特定股票
SELECT * FROM search_stocks('2330');
```

### 在應用程式中測試
1. 重新啟動 React Native 應用程式
2. 前往「資產負債」→「新增資產」→「台股」
3. 在股票搜尋欄位輸入：
   - `2` → 應該顯示所有 2 開頭的股票
   - `2330` → 應該顯示台積電
   - `台積` → 應該顯示台積電

## 🔄 自動更新設置

### GitHub Actions（推薦）
1. 將代碼推送到 GitHub
2. 在 GitHub Repository Settings → Secrets 中添加：
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
3. GitHub Actions 會每日自動更新股票資料

### 手動更新
隨時可以執行以下命令來手動更新：
```bash
node database/fetch_real_data.js
```

## 📈 資料來源

- **API**: 台灣證交所公開資料
- **端點**: `https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY_AVG_ALL`
- **更新頻率**: 每日收盤後
- **資料範圍**: 所有上市股票的收盤價

## 🛠️ 故障排除

### 常見問題

1. **API 無回應**
   - 檢查網路連接
   - 確認台灣證交所 API 是否正常運作
   - 嘗試不同的日期

2. **資料庫連接失敗**
   - 檢查 Supabase URL 和 Service Role Key
   - 確認 RLS 政策已正確設置

3. **沒有資料**
   - 確認執行日期是交易日
   - 檢查 API 回應狀態

### 日誌分析
腳本會提供詳細的執行日誌，包括：
- API 請求狀態
- 資料處理進度
- 資料庫更新結果
- 錯誤訊息和建議

## 🎯 下一步

資料設置完成後，您的股票搜尋功能將使用真實的台股資料，包括：
- ✅ 1000+ 檔台股的最新收盤價
- ✅ 完整的股票名稱和代號
- ✅ 每日自動更新機制
- ✅ 高效的搜尋功能

現在您可以在應用程式中享受完整的台股搜尋體驗！🎉

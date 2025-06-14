# 📤 手動上傳功能使用指南

## 🎯 功能概述

我們已經成功實現了按鍵式的本地數據上傳功能，讓用戶可以手動將本地的資產和交易數據上傳到 Supabase 雲端。

## 🔧 實現的功能

### 1. 新增的上傳服務
- **文件位置**: `src/services/manualUploadService.ts`
- **功能**: 專門處理本地數據到 Supabase 的上傳
- **支援數據類型**:
  - 交易記錄 (transactions)
  - 資產數據 (assets)
  - 負債數據 (liabilities)
  - 帳戶數據 (accounts)

### 2. 儀表板上傳按鈕
- **位置**: 儀表板右上角
- **顯示條件**: 只在用戶已登錄時顯示
- **圖標**: 雲端上傳圖標 (cloud-upload-outline)
- **功能**: 點擊後觸發手動上傳流程

### 3. 數據處理特性
- **UUID 自動生成**: 自動為無效 ID 生成有效的 UUID
- **數據驗證**: 過濾掉無效的交易記錄
- **錯誤處理**: 詳細的錯誤報告和處理
- **進度反饋**: 顯示上傳進度和結果

## 🚀 使用方法

### 步驟 1: 登錄帳號
1. 打開應用
2. 點擊「體驗雲端同步」或登錄按鈕
3. 使用 Google 登錄或電子郵件註冊/登錄

### 步驟 2: 手動上傳
1. 登錄成功後，在儀表板右上角會出現上傳按鈕
2. 點擊上傳按鈕 (雲端圖標)
3. 系統會顯示「上傳中」提示
4. 等待上傳完成

### 步驟 3: 查看結果
上傳完成後會顯示詳細結果：
- ✅ **成功**: 顯示各類型數據的上傳數量
- ❌ **失敗**: 顯示錯誤詳情和失敗原因

## 📊 上傳數據統計

上傳成功後會顯示類似以下的統計信息：
```
已成功上傳到雲端：
• 交易記錄：15 筆
• 資產數據：8 筆
• 負債數據：3 筆
• 帳戶數據：5 筆

總計：31 筆數據
```

## 🔒 安全機制

### 1. 用戶驗證
- 只有已登錄用戶才能上傳數據
- 使用 Supabase 的認證系統

### 2. Row Level Security (RLS)
- 每個用戶只能訪問自己的數據
- 防止數據洩露和未授權訪問

### 3. 數據隔離
- 自動添加 `user_id` 到所有記錄
- 確保數據歸屬正確

## 🛠️ 技術實現

### 核心服務類
```typescript
class ManualUploadService {
  async uploadAllLocalData(): Promise<UploadResult>
  private async uploadTransactions(userId: string): Promise<number>
  private async uploadAssets(userId: string): Promise<number>
  private async uploadLiabilities(userId: string): Promise<number>
  private async uploadAccounts(userId: string): Promise<number>
}
```

### UUID 處理
- 自動檢測無效的 ID 格式
- 生成符合 UUID v4 標準的新 ID
- 確保與 Supabase 數據庫兼容

### 錯誤處理
- 分層錯誤處理機制
- 詳細的錯誤日誌記錄
- 用戶友好的錯誤提示

## 🧪 測試驗證

### 1. 連接測試
```bash
node scripts/test-upload-fixed.js
```

### 2. 表結構驗證
- ✅ transactions 表
- ✅ assets 表  
- ✅ liabilities 表
- ✅ accounts 表

### 3. RLS 安全測試
- ✅ 未認證用戶無法插入數據
- ✅ 安全政策正常工作

## 📝 使用注意事項

### 1. 網路連接
- 確保設備有穩定的網路連接
- 上傳大量數據時可能需要較長時間

### 2. 數據重複
- 使用 `upsert` 操作避免重複數據
- 相同 ID 的記錄會被更新而非重複插入

### 3. 登錄狀態
- 必須保持登錄狀態才能上傳
- 登錄過期需要重新登錄

## 🔄 後續改進建議

### 1. 批量上傳優化
- 大數據集分批上傳
- 進度條顯示

### 2. 離線上傳隊列
- 網路斷線時暫存上傳請求
- 網路恢復後自動重試

### 3. 增量同步
- 只上傳變更的數據
- 減少網路流量和上傳時間

## 🎉 總結

手動上傳功能已經成功實現並可以正常使用！用戶現在可以：

1. ✅ 登錄帳號
2. ✅ 點擊上傳按鈕
3. ✅ 將本地資產和交易數據上傳到雲端
4. ✅ 查看詳細的上傳結果

這個功能為用戶提供了可靠的數據備份和同步機制，確保重要的財務數據安全存儲在雲端。

# 📊 FinTranzo 儲存方式完整分析報告

**分析日期**: 2025-06-19  
**目的**: 列出所有數據儲存方式，確保刪除功能覆蓋所有儲存位置

## 🗂️ 儲存方式清單

### 1. **AsyncStorage (主要儲存)**
**位置**: React Native 原生儲存  
**用途**: 手機端主要數據持久化

#### 儲存鍵名 (STORAGE_KEYS)
```typescript
// 來源: src/utils/storageManager.ts
export const STORAGE_KEYS = {
  // 交易相關
  TRANSACTIONS: '@FinTranzo:transactions',
  CATEGORIES: '@FinTranzo:categories', 
  ACCOUNTS: '@FinTranzo:accounts',
  INITIALIZED: '@FinTranzo:initialized',
  
  // 資產負債相關
  ASSETS: '@FinTranzo:assets',
  LIABILITIES: '@FinTranzo:liabilities',
  
  // 用戶資料
  USER_PROFILE: '@FinTranzo:userProfile',
  
  // 循環交易
  RECURRING_TRANSACTIONS: '@FinTranzo:recurringTransactions',
  
  // 其他
  SETTINGS: '@FinTranzo:settings',
  CACHE: '@FinTranzo:cache'
}
```

#### 額外發現的鍵名
```typescript
// 來源: src/utils/storageManager.ts (clearAllStorage 函數)
const additionalKeys = [
  'recurring_transactions',
  'future_transactions', 
  'user_preferences',
  'app_settings',
  'sync_status',
  'last_sync_time'
];
```

### 2. **localStorage (Web 環境備用)**
**位置**: 瀏覽器本地儲存  
**用途**: Web 版本的數據持久化

#### Web 環境鍵名
```typescript
// 來源: scripts/clear-browser-storage.js
const STORAGE_KEYS = {
  TRANSACTIONS: 'fintranzo_transactions',
  ASSETS: 'fintranzo_assets', 
  LIABILITIES: 'fintranzo_liabilities',
  CATEGORIES: 'fintranzo_categories',
  USER_PREFERENCES: 'fintranzo_user_preferences',
  RECURRING_TRANSACTIONS: 'fintranzo_recurring_transactions',
  INITIALIZED: 'fintranzo_initialized'
};
```

#### 額外 Web 鍵名
```typescript
const ADDITIONAL_KEYS = [
  'recurring_transactions',
  'future_transactions',
  'user_preferences', 
  'app_settings',
  'sync_status',
  'last_sync_time',
  'asset_data',
  'transaction_data',
  'liability_data'
];
```

### 3. **內存暫存 (In-Memory Storage)**
**位置**: 各服務類的私有變量  
**用途**: 運行時數據快取

#### 服務內存儲存
- **TransactionDataService**: `transactions[]`, `categories[]`, `accounts[]`
- **LiabilityService**: `liabilities[]`
- **AssetService**: `assets[]` (推測)
- **UnifiedDataManager**: `transactions[]`, `assets[]`, `liabilities[]`

### 4. **模擬儲存 (測試環境)**
**位置**: 測試腳本中的 Map 物件  
**用途**: 測試環境數據模擬

```typescript
// 來源: scripts/test-dashboard-delete.js
const mockStorage = {
  data: new Map(),
  // ... 模擬 AsyncStorage API
};
```

### 5. **跨平台適配儲存**
**位置**: `src/services/appInitializationService.ts`  
**用途**: 自動選擇適當的儲存方式

```typescript
// 手機環境：使用原生 AsyncStorage
// Web 環境：使用 localStorage 作為 fallback
AsyncStorage = {
  getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
  setItem: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
  removeItem: (key: string) => Promise.resolve(localStorage.removeItem(key)),
};
```

## 🔍 儲存位置模式分析

### 鍵名模式
1. **AsyncStorage 模式**: `@FinTranzo:*`
2. **localStorage 模式**: `fintranzo_*`
3. **舊版模式**: 直接使用功能名稱 (如 `recurring_transactions`)
4. **測試模式**: 各種變體和測試鍵名

### 可能遺漏的儲存位置
根據代碼分析，可能還有以下儲存位置：
- 以 `fintranzo_` 開頭的任何鍵
- 以 `transaction_` 開頭的鍵  
- 以 `asset_` 開頭的鍵
- 以 `liability_` 開頭的鍵
- 以 `recurring_` 開頭的鍵
- 包含 `financial` 的鍵

## ⚠️ 刪除功能問題分析

### 當前刪除覆蓋範圍
✅ **已覆蓋**:
- AsyncStorage 主要鍵名
- localStorage Web 鍵名  
- 額外發現的鍵名

❌ **可能遺漏**:
- 內存中的暫存數據
- 動態生成的鍵名
- 服務類中的私有變量
- 事件監聽器中的數據

### 刪除功能分散問題
目前刪除功能分散在多個地方：
1. `src/utils/storageManager.ts` - 通用清理
2. `scripts/clear-browser-storage.js` - 瀏覽器清理
3. 各個服務類的 `clearAllData()` 方法
4. 各個服務類的 `deleteLiability()`, `deleteTransaction()` 等方法

## 🔧 修復建議

### 1. 統一刪除入口
創建一個統一的刪除管理器，確保所有儲存位置都被正確清理。

### 2. 內存數據清理
確保所有服務類的內存數據都被正確重置。

### 3. 事件系統清理
清理所有事件監聽器和回調函數。

### 4. 跨平台兼容
確保 AsyncStorage 和 localStorage 都被正確處理。

### 5. 驗證機制
添加刪除後的驗證機制，確認所有數據都已清除。

## 📋 下一步行動

1. ✅ **列出所有儲存方式** (已完成)
2. ⏳ **停用即時同步功能** 
3. ⏳ **修復本地刪除功能**
4. ⏳ **修復手動上傳功能**
5. ⏳ **Docker 驗證測試**

## 🎯 結論

FinTranzo 使用了多種儲存方式：
- **主要**: AsyncStorage (手機) / localStorage (Web)
- **暫存**: 各服務類的內存變量
- **測試**: 模擬儲存物件

刪除功能需要確保覆蓋所有這些儲存位置，特別是內存中的暫存數據和事件監聽器。

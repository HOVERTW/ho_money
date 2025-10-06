# 📱 iOS 本地版本遷移計劃

## 🎯 目標
創建一個純本地存儲的iOS應用版本，移除所有雲端同步功能，資料只存在手機中。

## 📋 遷移步驟

### 階段 1: 移除雲端依賴 ✅

#### 1.1 移除 Supabase 相關套件
- [ ] 從 package.json 移除 `@supabase/supabase-js`
- [ ] 移除 `@env` 環境變數依賴
- [ ] 移除 `expo-auth-session` 相關套件

#### 1.2 移除雲端服務文件
- [ ] 刪除 `src/services/supabase.ts`
- [ ] 刪除 `src/services/supabaseConnectionManager.ts`
- [ ] 刪除 `src/services/realTimeSyncService.ts`
- [ ] 刪除 `src/services/userDataSyncService.ts`
- [ ] 刪除 `src/services/hybridAuthService.ts`
- [ ] 刪除 `src/services/unifiedDataManager.ts`
- [ ] 刪除 `src/services/enhancedSupabaseService.ts`

#### 1.3 移除認證相關
- [ ] 刪除 `src/screens/auth/LoginScreen.tsx`
- [ ] 刪除 `src/screens/auth/RegisterScreen.tsx`
- [ ] 刪除 `src/screens/auth/ForgotPasswordScreen.tsx`
- [ ] 刪除 `src/store/authStore.ts`
- [ ] 移除 Google OAuth 相關代碼

### 階段 2: 簡化本地存儲 ✅

#### 2.1 創建簡化的本地存儲服務
```typescript
// src/services/localStorageService.ts
- 使用 AsyncStorage 作為唯一存儲方式
- 統一鍵名格式: @HoMoney:*
- 簡化的 CRUD 操作
- 無需同步邏輯
```

#### 2.2 簡化數據服務
- [ ] 簡化 `transactionDataService.ts` - 移除雲端同步
- [ ] 簡化 `assetService.ts` - 移除雲端同步
- [ ] 簡化 `liabilityService.ts` - 移除雲端同步
- [ ] 移除所有 `syncTo*` 方法

### 階段 3: 修改導航結構 ✅

#### 3.1 移除認證流程
```typescript
// src/navigation/AppNavigator.tsx
- 移除 AuthStack
- 直接顯示 MainTabs
- 移除登錄狀態檢查
- 移除 session 監聽
```

#### 3.2 簡化主畫面
```typescript
// src/screens/main/DashboardScreen.tsx
- 移除登錄/註冊按鈕
- 移除雲端同步狀態顯示
- 移除用戶資料顯示
- 保留核心記帳功能
```

### 階段 4: 更新 UI 組件 ✅

#### 4.1 移除雲端相關 UI
- [ ] 移除「體驗雲端同步」橫幅
- [ ] 移除登錄狀態指示器
- [ ] 移除同步進度顯示
- [ ] 移除上傳/下載按鈕

#### 4.2 簡化設置頁面
- [ ] 移除帳號設置
- [ ] 移除雲端同步設置
- [ ] 保留本地數據管理
- [ ] 添加本地備份/還原功能（可選）

### 階段 5: 更新配置文件 ✅

#### 5.1 更新 app.json
```json
{
  "expo": {
    "name": "Ho記帳",
    "slug": "HoMoney",
    "version": "2.0.0",
    "ios": {
      "bundleIdentifier": "com.hovertw.homoney",
      "buildNumber": "2"
    }
  }
}
```

#### 5.2 更新 package.json
- [ ] 移除 Supabase 相關依賴
- [ ] 移除認證相關依賴
- [ ] 保留核心 React Native 依賴
- [ ] 保留 AsyncStorage

#### 5.3 移除環境變數
- [ ] 刪除 .env 文件
- [ ] 移除 Supabase URL/Key 配置

### 階段 6: 數據遷移 ✅

#### 6.1 本地數據保留
```typescript
// 保留現有本地數據
- 交易記錄
- 資產數據
- 負債數據
- 類別設置
```

#### 6.2 數據備份機制
```typescript
// 新增本地備份功能
- 導出為 JSON 文件
- 通過 AirDrop/分享功能備份
- 從 JSON 文件還原
```

### 階段 7: 測試與優化 ✅

#### 7.1 功能測試
- [ ] 交易新增/編輯/刪除
- [ ] 資產管理
- [ ] 負債管理
- [ ] 月曆顯示
- [ ] 圖表統計
- [ ] 資產負債表

#### 7.2 性能優化
- [ ] 移除網路請求延遲
- [ ] 優化本地存儲讀寫
- [ ] 減少應用體積
- [ ] 提升啟動速度

## 📦 保留的核心功能

### ✅ 保留功能
1. **交易管理**
   - 收入/支出記錄
   - 交易分類
   - 交易編輯/刪除
   - 月曆視圖

2. **資產管理**
   - 現金/銀行/投資/不動產
   - 資產增減記錄
   - 資產統計

3. **負債管理**
   - 負債記錄
   - 還款追蹤
   - 負債統計

4. **數據分析**
   - 收支圖表
   - 資產負債表
   - 現金流分析
   - 統計報表

5. **本地功能**
   - 搖動返回當月
   - 滑動刪除
   - 本地數據備份

### ❌ 移除功能
1. **雲端同步**
   - Supabase 同步
   - 實時數據同步
   - 多設備同步

2. **用戶認證**
   - 登錄/註冊
   - Google OAuth
   - 密碼重置
   - 用戶資料管理

3. **網路功能**
   - 雲端備份
   - 數據上傳/下載
   - 在線狀態檢查

## 🔧 技術變更

### 依賴變更
```json
// 移除
- @supabase/supabase-js
- expo-auth-session
- expo-web-browser
- @env

// 保留
- @react-native-async-storage/async-storage
- react-navigation
- expo-calendar
- react-native-gesture-handler
```

### 存儲架構
```
舊架構:
本地存儲 <-> 同步服務 <-> Supabase

新架構:
本地存儲 (AsyncStorage)
```

### 數據流
```
舊流程:
UI -> Service -> Local + Cloud

新流程:
UI -> Service -> Local Only
```

## 📱 iOS 特定優化

### 1. 本地數據持久化
- 使用 AsyncStorage 作為主要存儲
- 實現自動保存機制
- 添加數據完整性檢查

### 2. 備份與還原
- 使用 iOS 分享功能導出數據
- 支持從文件還原數據
- 可選：iCloud 備份（未來功能）

### 3. 性能優化
- 移除所有網路請求
- 減少應用體積
- 優化啟動時間
- 降低內存使用

## 🚀 部署計劃

### 1. 開發階段
- 在 `ios-local-only` 分支開發
- 逐步移除雲端功能
- 保持功能完整性

### 2. 測試階段
- 本地功能測試
- 數據持久化測試
- 性能測試
- iOS 設備測試

### 3. 發布階段
- 使用 EAS Build 構建
- TestFlight 內部測試
- App Store 發布

## 📝 注意事項

1. **數據安全**
   - 本地數據無雲端備份
   - 建議用戶定期導出備份
   - 提供數據導出功能

2. **用戶體驗**
   - 移除登錄流程，直接使用
   - 簡化界面，專注核心功能
   - 提供清晰的數據管理指引

3. **版本管理**
   - 保持 main 分支為雲端版本
   - ios-local-only 分支為本地版本
   - 兩個版本獨立維護

## ✅ 完成標準

- [ ] 所有雲端功能已移除
- [ ] 應用可離線完全運行
- [ ] 本地數據持久化正常
- [ ] 所有核心功能正常運作
- [ ] iOS 構建成功
- [ ] 應用體積減少 > 30%
- [ ] 啟動速度提升 > 50%
- [ ] 通過完整功能測試


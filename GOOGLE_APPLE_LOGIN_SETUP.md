# Google & Apple 登錄設置指南

## 📋 概述

本指南將幫助您在 FinTranzo 應用中設置 Google 和 Apple 社交登錄功能，並整合 Supabase 認證系統。

## 🔧 已完成的實施

### ✅ 前端實施
- [x] 安裝必要依賴 (`expo-auth-session`, `@supabase/supabase-js`)
- [x] 創建完整的 Supabase 客戶端
- [x] 實施 `authService` 支援社交登錄
- [x] 更新 `authStore` 添加 Google/Apple 登錄方法
- [x] 修改登錄界面添加社交登錄按鈕
- [x] 創建用戶數據同步服務
- [x] 整合認證狀態管理

### ✅ 後端準備
- [x] 創建數據庫表結構 SQL
- [x] 設置 Row Level Security (RLS) 政策
- [x] 配置用戶資料自動創建觸發器

## 🚀 Supabase 設置步驟

### 1. 執行數據庫設置

在 Supabase Dashboard 的 SQL Editor 中執行：

```sql
-- 執行 database/auth_tables_setup.sql 文件中的所有 SQL 命令
```

### 2. 配置 Google OAuth

1. **前往 Google Cloud Console**
   - 訪問：https://console.cloud.google.com/
   - 創建新項目或選擇現有項目

2. **啟用 Google+ API**
   - 在 API & Services > Library 中搜索 "Google+ API"
   - 點擊啟用

3. **創建 OAuth 2.0 憑證**
   - 前往 API & Services > Credentials
   - 點擊 "Create Credentials" > "OAuth 2.0 Client IDs"
   - 應用類型選擇 "Web application"
   - 添加授權重定向 URI：
     ```
     https://your-project-ref.supabase.co/auth/v1/callback
     ```

4. **在 Supabase 中配置 Google**
   - 前往 Supabase Dashboard > Authentication > Providers
   - 啟用 Google 提供商
   - 輸入 Google Client ID 和 Client Secret
   - 設置重定向 URL：`fintranzo://`

### 3. 配置 Apple OAuth (僅 iOS)

1. **前往 Apple Developer Console**
   - 訪問：https://developer.apple.com/account/

2. **創建 App ID**
   - 在 Certificates, Identifiers & Profiles 中創建新的 App ID
   - 啟用 "Sign In with Apple" 功能

3. **創建 Service ID**
   - 創建新的 Service ID
   - 配置 "Sign In with Apple"
   - 添加域名和重定向 URL

4. **在 Supabase 中配置 Apple**
   - 前往 Supabase Dashboard > Authentication > Providers
   - 啟用 Apple 提供商
   - 輸入必要的配置信息

## 🔑 環境變數設置

確保您的 `.env` 文件包含：

```env
# Supabase 配置
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# OAuth 重定向 URL (自動生成)
EXPO_PUBLIC_REDIRECT_URL=fintranzo://
```

## 📱 測試登錄功能

### 1. 啟動應用
```bash
npm start
# 或
npx expo start
```

### 2. 測試流程
1. 打開登錄頁面
2. 點擊 "使用 Google 登錄" 或 "使用 Apple 登錄"
3. 完成 OAuth 流程
4. 確認用戶數據正確同步

## 🔍 故障排除

### 常見問題

#### 1. OAuth 重定向失敗
**錯誤**: `Invalid redirect URI`
**解決方案**: 
- 檢查 Supabase 中的重定向 URL 設置
- 確認 `app.json` 中的 scheme 配置正確

#### 2. Google 登錄失敗
**錯誤**: `OAuth client not found`
**解決方案**:
- 確認 Google Cloud Console 中的 OAuth 憑證設置正確
- 檢查 Supabase 中的 Google Client ID 和 Secret

#### 3. 用戶數據同步失敗
**錯誤**: `Permission denied`
**解決方案**:
- 確認數據庫 RLS 政策已正確設置
- 檢查用戶是否已正確認證

#### 4. Apple 登錄在 Android 上不顯示
**說明**: Apple 登錄僅在 iOS 平台上可用
**解決方案**: 這是正常行為，Android 用戶只會看到 Google 登錄選項

## 📊 數據流程

### 登錄流程
1. 用戶點擊社交登錄按鈕
2. 打開 OAuth 提供商的認證頁面
3. 用戶完成認證
4. 重定向回應用並獲取 access token
5. 創建 Supabase session
6. 自動創建/更新用戶資料
7. 同步本地數據到雲端
8. 導航到主應用界面

### 數據同步
- **本地到雲端**: 首次登錄時遷移本地數據
- **雲端到本地**: 每次登錄時同步最新數據
- **實時同步**: 使用 Supabase RLS 確保數據安全

## 🔒 安全考量

### Row Level Security (RLS)
- 所有用戶數據表都啟用了 RLS
- 用戶只能訪問自己的數據
- 自動添加 `user_id` 到所有記錄

### 數據隱私
- 用戶資料僅存儲必要信息
- 支援用戶刪除帳戶和所有相關數據
- 遵循 GDPR 和其他隱私法規

## 📈 後續優化

### 可能的改進
1. **離線支援**: 實施離線數據同步
2. **多設備同步**: 支援多設備間的實時數據同步
3. **數據備份**: 定期備份用戶數據
4. **分析追蹤**: 添加用戶行為分析（匿名）

### 監控和維護
1. **錯誤追蹤**: 使用 Sentry 或類似服務
2. **性能監控**: 監控 API 響應時間
3. **用戶反饋**: 收集用戶對登錄體驗的反饋

## 🎉 完成！

您的 FinTranzo 應用現在支援：
- ✅ Google 社交登錄
- ✅ Apple 社交登錄 (iOS)
- ✅ 傳統電子郵件登錄
- ✅ 用戶數據雲端同步
- ✅ 安全的數據隔離

用戶現在可以使用他們喜歡的方式登錄，並且所有財務數據都會安全地保存在雲端！

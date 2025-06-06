# 🔐 OAuth 設置指南 - Google & Apple 登錄

## 📋 快速設置步驟

### 1️⃣ Supabase 數據庫設置

1. **打開 Supabase Dashboard**
   - 前往：https://yrryyapzkgrsahranzvo.supabase.co
   - 登錄您的帳戶

2. **執行 SQL 腳本**
   - 點擊左側菜單 "SQL Editor"
   - 創建新查詢
   - 複製並貼上 `database/simple_auth_setup.sql` 的內容
   - 點擊 "Run" 執行

### 2️⃣ Google OAuth 設置

1. **Google Cloud Console**
   - 前往：https://console.cloud.google.com/
   - 選擇或創建項目

2. **啟用 API**
   - 前往 "APIs & Services" > "Library"
   - 搜索並啟用 "Google+ API"

3. **創建 OAuth 憑證**
   - 前往 "APIs & Services" > "Credentials"
   - 點擊 "Create Credentials" > "OAuth 2.0 Client IDs"
   - 應用類型：Web application
   - 授權重定向 URI：
     ```
     https://yrryyapzkgrsahranzvo.supabase.co/auth/v1/callback
     ```

4. **在 Supabase 中配置**
   - 前往 Supabase Dashboard > Authentication > Providers
   - 找到 Google 並點擊啟用
   - 輸入 Client ID 和 Client Secret
   - 重定向 URL：`fintranzo://`

### 3️⃣ Apple OAuth 設置（僅 iOS）

1. **Apple Developer Console**
   - 前往：https://developer.apple.com/account/

2. **創建 App ID**
   - Certificates, Identifiers & Profiles > Identifiers
   - 創建新 App ID
   - 啟用 "Sign In with Apple"

3. **創建 Service ID**
   - 創建新 Service ID
   - 配置 "Sign In with Apple"
   - 域名：您的域名
   - 重定向 URL：
     ```
     https://yrryyapzkgrsahranzvo.supabase.co/auth/v1/callback
     ```

4. **在 Supabase 中配置**
   - 前往 Supabase Dashboard > Authentication > Providers
   - 找到 Apple 並點擊啟用
   - 輸入必要配置

### 4️⃣ 測試設置

1. **啟動應用**
   ```bash
   npm start
   ```

2. **測試登錄**
   - 打開應用
   - 嘗試 Google 登錄
   - 嘗試 Apple 登錄（僅 iOS）
   - 檢查用戶數據是否正確同步

## 🔧 故障排除

### 常見問題

**Q: Google 登錄失敗**
A: 檢查 Google Cloud Console 中的重定向 URI 是否正確

**Q: Apple 登錄在 Android 上不顯示**
A: 這是正常的，Apple 登錄僅在 iOS 上可用

**Q: 用戶數據沒有同步**
A: 檢查 Supabase 中的 RLS 政策是否正確設置

## 📊 驗證設置

運行測試腳本確認一切正常：
```bash
node test-auth-setup.js
```

應該看到所有檢查都通過 ✅

## 🎉 完成！

設置完成後，您的用戶可以：
- ✅ 使用 Google 帳戶登錄
- ✅ 使用 Apple 帳戶登錄（iOS）
- ✅ 使用電子郵件註冊/登錄
- ✅ 自動同步數據到雲端
- ✅ 在多設備間同步數據

所有財務數據都會安全地保存在 Supabase 中！

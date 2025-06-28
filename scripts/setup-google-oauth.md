# 🔧 Google OAuth 設置指南

## 📊 當前狀態

根據診斷結果：
- ✅ Supabase 連接正常
- ✅ Google Provider 已啟用
- ❌ Client ID 和 Secret 未配置

## 🎯 需要完成的設置

### 1. Google Cloud Console 設置

#### 步驟1: 創建項目
```
1. 前往 https://console.cloud.google.com/
2. 點擊項目選擇器
3. 點擊 "新增專案"
4. 專案名稱: FinTranzo-OAuth
5. 點擊 "建立"
```

#### 步驟2: 啟用 API
```
1. 前往 "API 和服務" > "程式庫"
2. 搜尋 "Google+ API"
3. 點擊並啟用
4. 或搜尋 "People API" 並啟用
```

#### 步驟3: 創建 OAuth 憑證
```
1. 前往 "API 和服務" > "憑證"
2. 點擊 "建立憑證" > "OAuth 2.0 用戶端 ID"
3. 應用程式類型: 網路應用程式
4. 名稱: FinTranzo Web Client
```

#### 步驟4: 配置重定向 URI
```
已授權的重定向 URI:
- https://yrryyapzkgrsahranzvo.supabase.co/auth/v1/callback
- https://19930913.xyz
- http://localhost:3000 (開發用)
```

#### 步驟5: 記錄憑證
```
複製以下資訊:
- 用戶端 ID: 類似 xxxxx.apps.googleusercontent.com
- 用戶端密鑰: 類似 GOCSPX-xxxxx
```

### 2. Supabase 設置

#### 在 Supabase Dashboard 中尋找 Google 設置

**可能的位置：**

1. **Authentication > Settings**
   - 查看是否有 "External providers" 區域
   - 查看是否有 "OAuth providers" 設置

2. **Authentication > Configuration**
   - 查看是否有 "Social providers" 設置
   - 查看是否有 "Third-party auth" 選項

3. **Authentication 主頁面**
   - 查看是否有 "Providers" 按鈕或連結
   - 查看是否有 "Google" 相關設置

4. **Project Settings**
   - 查看是否在項目設置中有認證相關配置

#### 需要輸入的資訊
```
Google Provider 設置:
- Enable Google Provider: ✅ 啟用
- Client ID: [從 Google Cloud Console 複製]
- Client Secret: [從 Google Cloud Console 複製]
```

#### Site URL 設置
```
Site URL: https://19930913.xyz
Redirect URLs:
- https://19930913.xyz
- http://localhost:3000
```

## 🔍 尋找 Supabase Google 設置的方法

### 方法1: 搜尋功能
在 Supabase Dashboard 中使用搜尋功能：
- 搜尋 "Google"
- 搜尋 "OAuth"
- 搜尋 "Provider"

### 方法2: 檢查所有標籤
在 Authentication 頁面中檢查所有可能的標籤：
- Settings
- Configuration
- Providers
- Social
- OAuth
- External

### 方法3: 檢查項目設置
前往 Project Settings 查看是否有認證相關設置。

## 🧪 驗證設置

設置完成後，運行驗證腳本：

```bash
node scripts/test-google-oauth.js
```

預期結果：
```
✅ Google OAuth 配置正常
✅ Client ID 已設置
✅ Redirect URI 已設置
```

## 📱 測試 Google 登錄

1. **訪問應用程式**: https://19930913.xyz
2. **點擊 Google 登錄按鈕**
3. **應該重定向到 Google 授權頁面**
4. **授權後應該成功登錄**

## 🔧 故障排除

### 如果仍然找不到 Google 設置

1. **檢查 Supabase 計劃**
   - 確認您的 Supabase 計劃支援 OAuth providers

2. **聯繫 Supabase 支援**
   - 如果界面中確實沒有 Google Provider 設置

3. **使用替代方案**
   - 考慮使用第三方 OAuth 庫
   - 或使用其他認證方式

### 常見錯誤

1. **"Provider not found"**
   - Google Provider 未啟用

2. **"Invalid client"**
   - Client ID 或 Secret 錯誤

3. **"redirect_uri_mismatch"**
   - 重定向 URI 不匹配

## 💡 下一步

1. **完成 Google Cloud Console 設置**
2. **在 Supabase 中找到並配置 Google Provider**
3. **測試 Google 登錄功能**
4. **確認用戶數據正確同步**

---

**🎯 關鍵：Google OAuth 需要 Google Cloud Console 和 Supabase 兩邊都正確配置！**

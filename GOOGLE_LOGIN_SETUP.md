# 🔐 Google 登錄設置指南

## 📋 快速設置步驟

### ✅ 已完成的部分
- [x] 前端 Google 登錄功能已實施
- [x] 數據庫表已創建（根據您的測試結果）
- [x] RLS 安全政策已設置
- [x] 環境變數已配置
- [x] 應用 OAuth 配置已完成

### 🔧 需要完成的步驟

#### 1️⃣ Google Cloud Console 設置

1. **前往 Google Cloud Console**
   - 訪問：https://console.cloud.google.com/
   - 選擇或創建項目

2. **啟用必要的 API**
   - 前往 "APIs & Services" > "Library"
   - 搜索並啟用 "Google+ API" 或 "Google Identity API"

3. **創建 OAuth 2.0 憑證**
   - 前往 "APIs & Services" > "Credentials"
   - 點擊 "Create Credentials" > "OAuth 2.0 Client IDs"
   - 應用類型：**Web application**
   - 名稱：FinTranzo
   - 授權重定向 URI：
     ```
     https://yrryyapzkgrsahranzvo.supabase.co/auth/v1/callback
     ```

4. **記錄憑證信息**
   - 複製 Client ID
   - 複製 Client Secret

#### 2️⃣ Supabase 配置

1. **前往 Supabase Dashboard**
   - 訪問：https://yrryyapzkgrsahranzvo.supabase.co
   - 登錄您的帳戶

2. **配置 Google 提供商**
   - 前往 Authentication > Providers
   - 找到 Google 並點擊啟用
   - 輸入從 Google Cloud Console 獲得的：
     - Client ID
     - Client Secret
   - 重定向 URL 設置為：`fintranzo://`

3. **檢查其他設置**
   - 確認 Email 提供商已啟用
   - Site URL 可以設置為您的應用 URL

#### 3️⃣ 測試 Google 登錄

1. **啟動應用**
   ```bash
   npm start
   ```

2. **測試登錄流程**
   - 打開應用
   - 點擊 "使用 Google 登錄"
   - 完成 Google OAuth 流程
   - 確認用戶數據正確同步

## 🔍 故障排除

### 常見問題

**Q: Google 登錄按鈕點擊後沒有反應**
A: 檢查以下項目：
- Google Cloud Console 中的重定向 URI 是否正確
- Supabase 中的 Google 提供商是否已啟用
- Client ID 和 Secret 是否正確輸入

**Q: OAuth 流程失敗**
A: 確認：
- Google Cloud Console 中的項目已啟用必要的 API
- 重定向 URI 完全匹配（包括 https://）
- Supabase 項目 URL 正確

**Q: 用戶登錄成功但數據沒有同步**
A: 檢查：
- 數據庫表是否已正確創建
- RLS 政策是否已設置
- 用戶 profile 是否已自動創建

## 📊 驗證設置

運行測試腳本確認配置：
```bash
node final-auth-test.js
```

應該看到 5/5 測試通過 ✅

## 🎯 預期結果

設置完成後：
- ✅ 用戶可以使用 Google 帳戶一鍵登錄
- ✅ 用戶資料自動創建和同步
- ✅ 本地數據自動遷移到雲端
- ✅ 多設備間數據同步
- ✅ 安全的數據隔離

## 📱 用戶體驗

登錄流程：
1. 用戶點擊 "使用 Google 登錄"
2. 打開 Google OAuth 頁面
3. 用戶授權應用訪問
4. 自動返回應用並完成登錄
5. 用戶數據自動同步

## 🔒 安全特性

- **OAuth 2.0**: 使用 Google 的安全認證標準
- **Row Level Security**: 用戶只能訪問自己的數據
- **自動用戶隔離**: 所有數據自動關聯用戶 ID
- **環境變數保護**: API 密鑰安全存儲

## 🎉 完成！

Google 登錄設置完成後，您的 FinTranzo 應用將具備：
- 現代化的社交登錄體驗
- 安全的雲端數據存儲
- 無縫的多設備同步
- 完整的用戶數據管理

只需要在 Google Cloud Console 和 Supabase Dashboard 中完成配置，就可以開始使用了！

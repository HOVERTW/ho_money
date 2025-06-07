# 📱 手機版 Google OAuth 修復指南

## 🔍 問題分析

當前錯誤：
```
com.apple.AuthenticationServices.WebAuthenticationSession error 1
type: "cancel"
```

這表示 OAuth 流程被系統取消，通常原因：
1. 重定向 URL 配置不正確
2. Supabase OAuth 設置問題
3. 深度連結配置問題

## 🔧 解決方案

### 1. 檢查 Supabase OAuth 設置

在 Supabase Dashboard 中：
1. 進入 Authentication > Settings
2. 檢查 Site URL: `fintranzo://`
3. 添加 Redirect URLs:
   - `fintranzo://auth`
   - `exp://192.168.0.38:8081/--/auth` (開發環境)

### 2. 更新 app.json 配置

```json
{
  "expo": {
    "scheme": "fintranzo",
    "plugins": [
      [
        "expo-auth-session",
        {
          "schemes": ["fintranzo"]
        }
      ]
    ]
  }
}
```

### 3. 使用 AuthSession 替代 WebBrowser

當前實現使用 WebBrowser，但 AuthSession 更適合 OAuth：

```typescript
import { AuthRequest, AuthSessionResult, makeRedirectUri } from 'expo-auth-session';

// 使用 AuthSession 而不是 WebBrowser
const redirectUri = makeRedirectUri({
  scheme: 'fintranzo',
  path: 'auth',
});
```

## 🚀 快速修復

### 方案 A: 簡化登錄（推薦）
暫時禁用 Google 登錄，只使用電子郵件登錄：

```typescript
// 在登錄模態中隱藏 Google 登錄按鈕
{Platform.OS !== 'web' && (
  <TouchableOpacity 
    onPress={handleGoogleLogin} 
    style={[styles.googleLoginButton, { opacity: 0.5 }]}
    disabled={true}
  >
    <Text style={styles.googleLoginText}>Google 登錄（開發中）</Text>
  </TouchableOpacity>
)}
```

### 方案 B: 修復 OAuth 流程
1. 更新 Supabase 設置
2. 修改重定向 URL
3. 使用 AuthSession

## 📋 測試步驟

1. **測試電子郵件登錄**：
   - 註冊新帳號
   - 登錄現有帳號
   - 測試同步功能

2. **測試 Google 登錄**（修復後）：
   - 點擊 Google 登錄
   - 完成 OAuth 流程
   - 確認登錄成功

## 🎯 當前狀態

✅ **圖表功能**：已恢復，手機版正常顯示
✅ **上傳按鈕**：正常工作
✅ **登錄模態**：正常顯示
✅ **電子郵件登錄**：應該正常工作
❌ **Google 登錄**：需要修復 OAuth 配置

## 🔄 下一步

1. 先測試電子郵件登錄功能
2. 確認同步功能正常
3. 再修復 Google OAuth（可選）

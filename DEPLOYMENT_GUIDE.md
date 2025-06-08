# 🌐 部署到自定義網域指南

## 📋 部署步驟

### 1. Supabase 配置更新

請在 Supabase Dashboard 中更新以下設置：

#### **Authentication > URL Configuration**
- **Site URL**: `https://19930913.xyz`
- **Redirect URLs**: 
  - `https://19930913.xyz`
  - `https://19930913.xyz/**`
  - `https://19930913.xyz/auth/callback`

#### **Google OAuth 設置**
如果使用 Google OAuth，請在 Google Cloud Console 中添加：
- **Authorized JavaScript origins**: `https://19930913.xyz`
- **Authorized redirect URIs**: `https://19930913.xyz/auth/callback`

### 2. GitHub Secrets 設置

確保在 GitHub Repository Settings > Secrets and variables > Actions 中設置：

```
EXPO_PUBLIC_SUPABASE_URL=https://yrryyapzkgrsahranzvo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. 網域 DNS 設置

在您的網域提供商（如 Cloudflare）中設置：

#### **CNAME 記錄**
```
Type: CNAME
Name: 19930913.xyz (或 @)
Target: yourusername.github.io
```

#### **GitHub Pages 設置**
1. 前往 GitHub Repository Settings > Pages
2. Source: Deploy from a branch
3. Branch: gh-pages
4. Custom domain: 19930913.xyz
5. 勾選 "Enforce HTTPS"

### 4. 本地測試

```bash
# 安裝依賴
npm install

# 本地開發（仍使用 localhost）
npm start

# 構建 Web 版本
npm run build:web

# 本地預覽構建結果
npx serve dist
```

### 5. 部署流程

```bash
# 提交代碼到 main 分支
git add .
git commit -m "配置自定義網域部署"
git push origin main
```

GitHub Actions 將自動：
1. 構建 Web 版本
2. 創建 CNAME 文件
3. 部署到 GitHub Pages
4. 使用自定義網域 https://19930913.xyz

## 🔧 故障排除

### 常見問題

1. **404 錯誤**
   - 檢查 GitHub Pages 設置
   - 確認 CNAME 文件存在
   - 等待 DNS 傳播（最多 24 小時）

2. **OAuth 登入失敗**
   - 檢查 Supabase 重定向 URL 設置
   - 確認 Google OAuth 設置正確

3. **HTTPS 證書問題**
   - 在 GitHub Pages 設置中勾選 "Enforce HTTPS"
   - 等待證書生成（可能需要幾分鐘）

### 驗證部署

部署完成後，訪問 https://19930913.xyz 應該能看到：
- ✅ 應用程式正常載入
- ✅ Google OAuth 登入正常
- ✅ Supabase 數據同步正常
- ✅ 所有功能正常運作

## 📱 移動端測試

Web 版本部署後，您也可以在移動設備上測試：
- 在手機瀏覽器中訪問 https://19930913.xyz
- 應用程式會以 PWA 模式運行
- 支援大部分功能，包括搖一搖檢測

## 🚀 後續優化

1. **PWA 功能**
   - 添加 Service Worker
   - 支援離線使用
   - 添加到主屏幕

2. **性能優化**
   - 代碼分割
   - 圖片優化
   - 緩存策略

3. **SEO 優化**
   - Meta 標籤
   - Open Graph 標籤
   - 結構化數據

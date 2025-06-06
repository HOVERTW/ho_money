# 🔄 GitHub 專案重建指南

## 🚨 為什麼要重建專案？

由於 Supabase 金鑰已暴露在 Git 歷史中，且無法重新生成金鑰，最安全的做法是：
1. **刪除整個 GitHub 專案**
2. **重新創建乾淨的專案**
3. **確保沒有敏感資訊**

## 📋 重建步驟

### 步驟 1：備份本地專案
```bash
# 1. 創建備份目錄
mkdir ../FinTranzo-backup
cp -r . ../FinTranzo-backup/

# 2. 確認備份完成
ls ../FinTranzo-backup/
```

### 步驟 2：清理敏感檔案
```bash
# 在當前專案目錄中刪除敏感檔案
rm .env
rm -rf .git

# 確認 .gitignore 已更新（我們已經修正過）
cat .gitignore | grep ".env"
```

### 步驟 3：刪除 GitHub 專案
1. **前往 GitHub**：https://github.com/HOVERTW/FinTranzo
2. **點擊 Settings**（在專案頁面右上角）
3. **滾動到最下方**：找到 "Danger Zone"
4. **點擊 "Delete this repository"**
5. **輸入專案名稱確認**：`HOVERTW/FinTranzo`
6. **點擊 "I understand the consequences, delete this repository"**

### 步驟 4：創建新的 GitHub 專案
1. **前往 GitHub**：https://github.com/new
2. **Repository name**：`FinTranzo`
3. **Description**：`個人財務管理應用程式 - 支援台股、美股、ETF 追蹤`
4. **設為 Private**（建議）
5. **不要**勾選 "Add a README file"
6. **點擊 "Create repository"**

### 步驟 5：重新初始化本地 Git
```bash
# 在專案目錄中
git init
git add .
git commit -m "🎉 Initial commit - Clean project without sensitive data"

# 連接到新的 GitHub 專案
git remote add origin https://github.com/HOVERTW/FinTranzo.git
git branch -M main
git push -u origin main
```

### 步驟 6：設置 GitHub Secrets
1. **前往新專案的 Settings**
2. **Secrets and variables > Actions**
3. **添加以下 Secrets**：
   ```
   SUPABASE_URL: https://yrryyapzkgrsahranzvo.supabase.co
   SUPABASE_ANON_KEY: [您的 Supabase Anon Key]
   ```

### 步驟 7：創建本地 .env 檔案
```bash
# 複製範本
cp .env.example .env

# 編輯 .env 檔案
nano .env
```

**填入以下內容**：
```env
# Supabase 配置
EXPO_PUBLIC_SUPABASE_URL=https://yrryyapzkgrsahranzvo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=您的_Supabase_Anon_Key
SUPABASE_SERVICE_ROLE_KEY=您的_Supabase_Service_Role_Key

# 其他配置
NODE_ENV=development
DEBUG=false
```

### 步驟 8：測試新專案
```bash
# 測試匯率更新
npm run update:rates

# 測試台股更新
npm run update:tw

# 執行安全檢查
node scripts/security-check.js
```

## ✅ 重建完成檢查清單

### GitHub 專案
- [ ] 舊專案已刪除
- [ ] 新專案已創建
- [ ] 代碼已推送到新專案
- [ ] GitHub Secrets 已設置

### 本地環境
- [ ] .env 檔案已創建（包含正確金鑰）
- [ ] .env 檔案不在 Git 中
- [ ] 安全檢查通過
- [ ] 腳本測試正常

### 安全狀態
- [ ] 沒有敏感資訊在 Git 歷史中
- [ ] .gitignore 正確設置
- [ ] 所有金鑰都在環境變數中

## 🎯 重建後的優勢

### 安全性
- ✅ **完全乾淨的 Git 歷史**
- ✅ **沒有暴露的金鑰**
- ✅ **正確的 .gitignore 設置**

### 功能性
- ✅ **所有功能保持不變**
- ✅ **GitHub Actions 正常運行**
- ✅ **Supabase 連接正常**

### 維護性
- ✅ **清晰的專案結構**
- ✅ **完整的安全指南**
- ✅ **自動安全檢查**

## 🚨 重要提醒

### 執行前確認
1. **確認沒有其他人 clone 過專案**
2. **確認所有重要代碼都已備份**
3. **確認 Supabase 資料庫不會受影響**

### 執行後檢查
1. **測試所有主要功能**
2. **確認 GitHub Actions 正常**
3. **執行安全檢查腳本**

## 📞 如果遇到問題

### 常見問題
1. **推送失敗**：檢查 GitHub 專案 URL 是否正確
2. **GitHub Actions 失敗**：檢查 Secrets 是否正確設置
3. **Supabase 連接失敗**：檢查 .env 檔案中的金鑰

### 解決方案
```bash
# 檢查 Git 遠端設置
git remote -v

# 檢查環境變數
cat .env

# 執行安全檢查
node scripts/security-check.js
```

---

**這是最安全的解決方案！** 🛡️

重建專案後，您將擁有一個完全乾淨、安全的 GitHub 專案，沒有任何敏感資訊的歷史記錄。

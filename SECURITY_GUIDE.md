# 🔒 FinTranzo 安全指南

## 🚨 緊急安全措施

### 立即行動清單

1. **重新生成 Supabase 金鑰**
   - 前往 [Supabase Dashboard](https://app.supabase.com)
   - Settings > API
   - 重新生成 Anon Key 和 Service Role Key

2. **從 Git 中移除敏感檔案**
   ```bash
   git rm --cached .env
   git commit -m "🔒 Remove exposed environment variables"
   git push origin main
   ```

3. **更新 GitHub Secrets**
   - 前往 GitHub Repository Settings
   - Secrets and variables > Actions
   - 更新 `SUPABASE_ANON_KEY` 和 `SUPABASE_URL`

## 📋 環境變數管理

### 本地開發
```bash
# 1. 複製範本檔案
cp .env.example .env

# 2. 編輯 .env 檔案，填入實際值
nano .env

# 3. 確認 .env 在 .gitignore 中
grep ".env" .gitignore
```

### 生產環境
- ✅ 使用 GitHub Secrets
- ✅ 使用 Vercel Environment Variables
- ✅ 使用 Docker Secrets
- ❌ 永遠不要硬編碼在程式碼中

## 🛡️ 安全最佳實踐

### 1. 金鑰管理
- **Anon Key**: 可以在客戶端使用，但有 RLS 限制
- **Service Role Key**: 僅在伺服器端使用，有完整權限
- **定期輪換**: 每 3-6 個月更換一次金鑰

### 2. 檔案保護
```bash
# 這些檔案永遠不應該被提交
.env
.env.local
.env.production
config/secrets.js
database/credentials.json
```

### 3. 程式碼檢查
```bash
# 檢查是否有硬編碼的金鑰
grep -r "eyJ" . --exclude-dir=node_modules
grep -r "sk_" . --exclude-dir=node_modules
grep -r "pk_" . --exclude-dir=node_modules
```

## 🔍 安全檢查清單

### 每次部署前檢查
- [ ] `.env` 檔案不在 Git 中
- [ ] 所有金鑰都使用環境變數
- [ ] GitHub Secrets 已更新
- [ ] 沒有硬編碼的 API 金鑰
- [ ] Supabase RLS 政策已啟用

### 定期安全審查
- [ ] 檢查 Supabase 存取日誌
- [ ] 審查 API 使用量
- [ ] 更新依賴套件
- [ ] 檢查 GitHub Actions 日誌

## 🚨 如果金鑰洩露

### 立即行動
1. **撤銷所有相關金鑰**
2. **檢查存取日誌**
3. **更改所有密碼**
4. **通知團隊成員**
5. **監控異常活動**

### 預防措施
```bash
# 設置 Git hooks 防止提交敏感檔案
echo '#!/bin/sh
if git diff --cached --name-only | grep -q "\.env$"; then
  echo "Error: .env file should not be committed"
  exit 1
fi' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## 📞 緊急聯絡

如果發現安全問題：
1. 立即停止所有相關服務
2. 聯絡系統管理員
3. 記錄所有相關資訊
4. 按照此指南進行修復

## 🔗 相關資源

- [Supabase 安全指南](https://supabase.com/docs/guides/auth/row-level-security)
- [GitHub Secrets 文件](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [環境變數最佳實踐](https://12factor.net/config)

---

**記住：安全是每個人的責任！** 🛡️

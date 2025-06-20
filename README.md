# 💰 FinTranzo - 智能個人財務管理應用

一個功能完整的跨平台個人財務管理應用，提供資產負債管理、智能記帳、雲端同步等核心功能。專為移動端優化，支援 Web 和 iOS 平台。

🌐 **線上體驗**: [https://19930913.xyz](https://19930913.xyz)
📱 **移動端優先**: 專為移動設備優化，支援 iOS 和 Web 平台
☁️ **雲端同步**: 基於 Supabase 的實時數據同步
🔐 **安全認證**: Google OAuth + 電子郵件雙重認證
🧪 **全面測試**: 內建診斷工具，確保功能穩定性

## 🌟 核心功能

### 📊 智能資產管理
- **多元資產類型**：現金、股票、不動產、保險、加密貨幣等完整資產類別
- **即時價值計算**：自動計算資產當前價值和損益變化
- **拖拽排序**：支援資產項目的自由排序和分組管理
- **滑動操作**：支援滑動手勢快速刪除資產，操作直觀便捷
- **自動同步**：資產變更自動同步到雲端，確保數據一致性

### 💳 智能記帳系統
- **快速記帳**：支援收入、支出、轉帳三種交易類型
- **帳戶整合**：記帳時可選擇資產帳戶，自動更新餘額
- **豐富分類**：內建完整的收支分類體系，支援自定義
- **搖一搖功能**：手機搖動（加速度 8+）快速開啟記帳頁面
- **智能關聯**：交易自動更新對應資產餘額，保持數據同步

### 🔐 安全認證系統
- **雙重認證**：支援 Google OAuth 和電子郵件註冊/登錄
- **安全存儲**：本地數據加密存儲，雲端數據安全傳輸
- **權限控制**：基於 Supabase RLS 的用戶數據隔離
- **會話管理**：智能會話管理，支援自動登錄和安全登出
- **測試帳號**：提供 user01@gmail.com / user01 測試帳號

### ☁️ 智能雲端同步
- **實時同步**：基於 Supabase 的實時數據同步機制
- **離線支援**：本地優先存儲，離線可用，上線後自動同步
- **衝突解決**：智能處理數據同步衝突，基於時間戳優先策略
- **增量同步**：只同步變更數據，提高同步效率
- **手動控制**：支援手動觸發同步，用戶可控制同步時機

### 📈 數據分析與洞察
- **圖表展示**：收支趨勢和資產分布的視覺化圖表
- **現金流分析**：詳細的現金流入流出分析和預測
- **淨值追蹤**：總資產和淨值變化的長期追蹤
- **年度成長**：智能年度成長率計算（支援從 0 開始的 ∞% 顯示）
- **儀表板**：一目了然的財務狀況總覽（顯示前 5 大收支項目）

## 🛠️ 技術架構

### 前端技術棧
- **React Native + Expo 51**：跨平台移動應用開發框架
- **TypeScript**：類型安全的 JavaScript，提供更好的開發體驗
- **React Navigation 6**：現代化的頁面導航和路由管理
- **React Native Web**：支援 Web 端運行，一套代碼多平台部署
- **Zustand**：輕量級狀態管理，替代 Redux 的現代化方案
- **React Native Gesture Handler**：原生手勢支援，提供流暢的用戶體驗

### 後端服務架構
- **Supabase**：現代化的 Firebase 替代方案
  - **PostgreSQL 數據庫**：可靠的關係型數據庫
  - **實時訂閱**：WebSocket 實時數據同步
  - **身份驗證服務**：內建 OAuth 和電子郵件認證
  - **Row Level Security (RLS)**：數據庫級別的安全控制
  - **Google OAuth 整合**：安全便捷的第三方登錄
  - **Edge Functions**：無服務器函數支援

### 數據存儲策略
- **本地存儲**：AsyncStorage (移動端) / localStorage (Web 端)
- **雲端數據庫**：Supabase PostgreSQL 與實時同步
- **雙向同步**：本地優先，雲端備份的混合存儲策略
- **衝突解決**：基於時間戳的智能數據合併
- **離線支援**：完整的離線功能，上線後自動同步

### 部署與運維
- **GitHub Pages**：Web 端自動部署到 https://19930913.xyz
- **GitHub Actions**：CI/CD 自動化構建和部署
- **EAS Build**：Expo 官方構建服務，支援 iOS 和 Android
- **Docker 容器化**：完整的開發和生產環境容器化
- **環境變數管理**：安全的配置管理，支援多環境部署

## 🚀 快速開始

### 環境要求
- **Node.js 18+**：建議使用 LTS 版本
- **npm 或 yarn**：包管理工具
- **Expo CLI**：`npm install -g @expo/cli`
- **Git**：版本控制工具
- **現代瀏覽器**：Chrome、Safari、Firefox 等

### 🌐 線上體驗（推薦）

**最簡單的方式是直接訪問線上版本：**

1. **訪問應用**：[https://19930913.xyz](https://19930913.xyz)
2. **測試帳號**：
   - 電子郵件：`user01@gmail.com`
   - 密碼：`user01`
3. **功能測試**：
   - 未登錄：體驗本地功能（乾淨的數據環境）
   - 登錄後：體驗雲端同步功能
   - Google OAuth：測試第三方登錄

### 📱 本地開發環境

1. **克隆項目**
```bash
git clone https://github.com/HOVERTW/ho_money.git
cd ho_money
```

2. **安裝依賴**
```bash
npm install
```

3. **環境配置**
創建 `.env` 文件：
```env
EXPO_PUBLIC_SUPABASE_URL=https://yrryyapzkgrsahranzvo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_REDIRECT_URL=http://localhost:8081
```

4. **啟動開發服務器**
```bash
# Web 版本（推薦）
npx expo start --web

# 移動端版本
npx expo start
```

5. **訪問應用**
- **Web**：http://localhost:8081
- **手機**：掃描 QR 碼或使用 Expo Go 應用

### 🧪 內建診斷工具

**FinTranzo 內建了完整的診斷工具，幫助快速識別和解決問題：**

#### **自動診斷（開發環境）**
- 應用啟動時自動運行 Supabase 連接測試
- 環境變數驗證和配置檢查
- 認證狀態和數據庫連接驗證
- 詳細的日誌記錄和錯誤報告

#### **手動診斷工具**
- **登錄頁面**：「Supabase 連接測試」按鈕
- **測試功能**：「創建測試用戶」功能
- **實時監控**：Console 中的詳細日誌
- **錯誤追蹤**：自動錯誤捕獲和報告

#### **診斷使用方法**
1. **打開瀏覽器開發者工具**（F12）
2. **查看 Console 標籤**
3. **尋找診斷日誌**：
   ```
   🧪 === SUPABASE 連接測試開始 ===
   🔍 1. 檢查環境變數...
   📍 Supabase URL: https://yrryyapzkgrsahranzvo.supabase.co
   🔑 Supabase Key 存在: true
   ✅ 基本連接成功
   ```
4. **使用手動測試按鈕**進行即時診斷

## � 認證系統配置

### Supabase 認證設置

**為了讓認證功能正常工作，需要在 Supabase 中進行以下配置：**

#### **1. Google OAuth 設置**
在 Supabase Dashboard → Authentication → Providers → Google：
- ✅ 啟用 Google 提供者
- ✅ 設置 Google Client ID 和 Client Secret
- ✅ 配置重定向 URL：
  - **Web**: `https://19930913.xyz`
  - **本地開發**: `http://localhost:8081`
  - **移動端**: `fintranzo://auth`

#### **2. 電子郵件認證設置**
在 Supabase Dashboard → Authentication → Settings：
- ✅ 啟用電子郵件確認
- ✅ 設置電子郵件模板
- ✅ 配置 SMTP 設置（可選，使用預設或自定義）

#### **3. URL 配置**
在 Supabase Dashboard → Authentication → URL Configuration：
```
Site URL: https://19930913.xyz
Redirect URLs:
- https://19930913.xyz
- http://localhost:8081
- fintranzo://auth
- fintranzo://auth/confirm
```

#### **4. 測試帳號**
系統提供測試帳號供開發和測試使用：
- **電子郵件**: `user01@gmail.com`
- **密碼**: `user01`
- **狀態**: 已確認，可直接登錄

## 📱 部署

### Web 部署 (GitHub Pages)
```bash
npm run build:web
npm run deploy
```

### 移動端構建
```bash
# iOS
eas build --platform ios --profile preview

# Android
eas build --platform android --profile preview
```

### 🚀 生產部署
```bash
# 使用 Docker Compose 生產環境
docker-compose -f docker-compose.production.yml up -d

# 包含完整監控和備份系統
# - Web 服務: https://19930913.xyz
# - 監控面板: http://localhost:3000
# - 日誌系統: http://localhost:3100
```

## 🧪 測試與驗證

### 🐳 Docker 測試環境
```bash
# 運行完整測試套件
npm run docker:test

# 運行特定測試
docker-compose -f docker-compose.test.yml run --rm web-e2e
docker-compose -f docker-compose.test.yml run --rm performance-test
```

### 🔄 五大核心功能測試
```bash
# 測試五大核心功能
node scripts/comprehensive-five-functions-test.js

# 核心功能包括:
# 1. 交易創建與資產同步
# 2. 資產自動更新
# 3. 刪除同步
# 4. 類別保持
# 5. 雲端同步
```

### ☸️ Kubernetes 測試
```bash
# 部署測試環境
kubectl apply -f k8s/test-job.yaml

# 運行驗證測試
kubectl apply -f k8s/validation-job.yaml

# 查看測試結果
kubectl logs job/fintranzo-validation -n fintranzo
```

## 🗄️ 數據庫結構

### 主要數據表
- `assets` - 資產數據 (支援 upsert 操作)
- `transactions` - 交易記錄 (UUID 主鍵)
- `liabilities` - 負債數據 (月曆顯示)
- `exchange_rates` - 匯率數據
- `user_profiles` - 用戶資料
- `categories` - 交易分類 (防止刪除時丟失)

### 數據同步機制
- **實時同步**：Supabase 實時訂閱
- **衝突解決**：時間戳優先策略
- **增量同步**：只同步變更數據
- **離線支援**：本地優先，上線後同步

## 🔧 核心服務

### 資產管理服務
- `assetTransactionSyncService` - 資產與交易同步
- `liabilityService` - 負債管理
- `userProfileService` - 用戶資料管理
- `realTimeSyncService` - 實時同步服務

### 數據服務
- `transactionDataService` - 交易數據管理
- `userDataSyncService` - 用戶數據同步
- `appInitializationService` - 應用初始化
- `supabaseService` - Supabase 連接管理

### 工具服務
- `financialCalculator` - 財務計算
- `storageManager` - 存儲管理
- `forceRefreshManager` - 強制刷新管理
- `syncStatusManager` - 同步狀態管理

### 🔄 同步架構
- **雙向同步**：本地 ↔ Supabase
- **實時更新**：WebSocket 連接
- **離線隊列**：離線操作緩存
- **衝突解決**：智能合併策略

## 🎯 使用指南

### 1. 首次使用
1. 訪問 [https://19930913.xyz](https://19930913.xyz)
2. 點擊「體驗雲端同步」進行 Google 登入
3. 測試帳號：user01@gmail.com / user01
4. 登入後數據會自動同步到雲端
5. 開始添加您的資產和記錄交易

### 2. 資產管理
1. 進入「資產負債」頁面
2. 點擊「+」添加新資產
3. 選擇資產類型並填寫詳細信息
4. 支援滑動刪除操作
5. 資產會自動同步到雲端

### 3. 記帳功能
1. 進入「記帳」頁面或搖動手機 (加速度 8+)
2. 選擇交易類型（收入/支出/轉帳）
3. 選擇對應的資產帳戶
4. 填寫金額和備註
5. 交易會自動更新相關資產餘額
6. 支援滑動刪除交易記錄

### 4. 數據分析
1. 查看「圖表」頁面了解收支趨勢
2. 「現金流」頁面分析資金流向
3. 「儀表板」總覽財務狀況 (顯示5筆最大收支)
4. 年度成長率計算 (0→100萬顯示+100萬(∞%))

### 5. 雲端同步
1. 登入後自動啟用實時同步
2. 支援手動上傳本地數據
3. 刪除和修改操作同步到 Supabase
4. 離線操作會在上線後自動同步

## 🔒 安全性

- **數據加密**：敏感數據傳輸加密
- **身份驗證**：Google OAuth 安全登入
- **權限控制**：Row Level Security 確保數據隔離
- **本地備份**：重要數據本地備份
- **環境隔離**：Docker 容器化部署
- **API 密鑰管理**：環境變量安全存儲

## 🐛 故障排除

### 常見問題

1. **Supabase 連接失敗**
```bash
# 檢查環境變量
echo $EXPO_PUBLIC_SUPABASE_URL
echo $EXPO_PUBLIC_SUPABASE_ANON_KEY

# 測試連接
node scripts/test-supabase-connection.js
```

2. **Docker 環境問題**
```bash
# 清理 Docker 環境
docker system prune -a

# 重新構建
docker-compose build --no-cache
```

3. **同步問題**
```bash
# 運行同步測試
node scripts/comprehensive-sync-test.js

# 檢查同步狀態
node scripts/debug-real-environment.js
```

4. **iOS 模擬器問題**
```bash
# 重啟 iOS 模擬器容器
docker-compose restart fintranzo-ios-simulator

# 檢查端口占用
netstat -tulpn | grep :19000
```

## 📊 監控與日誌

### Grafana 監控面板
```bash
# 啟動監控服務
docker-compose -f docker-compose.production.yml up grafana prometheus

# 訪問監控面板
# URL: http://localhost:3000
# 用戶名: admin
# 密碼: admin123
```

### 日誌系統
```bash
# 啟動日誌收集
docker-compose -f docker-compose.production.yml up loki promtail

# 查看應用日誌
docker-compose logs -f fintranzo-web
```

## 🤝 貢獻指南

### 開發流程
1. Fork 項目
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. **必須通過 Docker 測試** (`npm run docker:test`)
4. **必須通過 Kubernetes 驗證** (`kubectl apply -f k8s/test-job.yaml`)
5. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
6. 推送到分支 (`git push origin feature/AmazingFeature`)
7. 開啟 Pull Request

### 測試要求
- ✅ 五大核心功能測試通過
- ✅ Docker 環境測試通過
- ✅ Kubernetes 部署測試通過
- ✅ 真實環境 10 輪測試通過

## 📄 許可證

本項目採用 MIT 許可證 - 查看 [LICENSE](LICENSE) 文件了解詳情。

## 🆘 支援

如果您遇到問題或有建議，請：
1. 查看 [Issues](https://github.com/HOVERTW/ho_money/issues)
2. 查看故障排除部分
3. 運行診斷腳本：`node scripts/emergency-diagnosis.js`
4. 創建新的 Issue
5. 聯繫開發團隊

## 📚 相關文檔

- [Docker 完整指南](DOCKER_GUIDE.md)
- [部署指南](DEPLOYMENT_GUIDE.md)
- [安全指南](SECURITY_GUIDE.md)
- [測試報告](TEST_REPORT.md)

## 🎉 致謝

感謝所有為這個項目做出貢獻的開發者和用戶！

特別感謝：
- **Supabase** 提供可靠的後端服務
- **Expo** 提供優秀的跨平台開發框架
- **Docker** 和 **Kubernetes** 提供容器化解決方案

---

**FinTranzo** - 讓財務管理變得簡單而智能 💰✨

🌐 **線上體驗**: [https://19930913.xyz](https://19930913.xyz)
📱 **移動端優先**: 專為移動設備優化
☁️ **雲端同步**: 基於 Supabase 的可靠數據同步
🐳 **容器化部署**: Docker + Kubernetes 生產級部署

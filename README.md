# 💰 FinTranzo - 個人財務管理應用

一個功能完整的個人財務管理應用，支援資產負債管理、記帳功能、雲端同步等核心功能。

🌐 **線上體驗**: [https://19930913.xyz](https://19930913.xyz)
📱 **移動端優先**: 專為移動設備優化，同時支援Web端
☁️ **雲端同步**: 基於Supabase的可靠數據同步

## 🌟 主要功能

### 📊 資產負債管理
- **多元資產類型**：現金、股票、不動產、保險、加密貨幣等
- **即時價值計算**：自動計算資產當前價值和損益
- **拖拽排序**：支援資產項目的自由排序
- **詳細分類**：按資產類型分組顯示
- **滑動刪除**：支援滑動手勢快速刪除資產

### 💳 智能記帳系統
- **快速記帳**：支援收入、支出、轉帳記錄
- **帳戶整合**：記帳時可選擇資產帳戶進行扣款
- **分類管理**：豐富的收支分類選項
- **搖一搖功能**：手機搖動快速開啟記帳頁面
- **自動資產更新**：交易自動更新對應資產餘額

### ☁️ 雲端同步
- **Google OAuth 登入**：安全便捷的身份驗證
- **Supabase 後端**：可靠的雲端數據存儲
- **實時同步**：資產和交易數據實時同步到雲端
- **離線支援**：本地存儲確保離線可用
- **衝突解決**：智能處理數據同步衝突

### 📈 數據分析
- **圖表展示**：收支趨勢和資產分布圖表
- **現金流分析**：詳細的現金流入流出分析
- **淨值追蹤**：總資產和淨值變化追蹤
- **年度成長**：年度資產成長率計算（支援∞%顯示）

## 🛠️ 技術架構

### 前端技術
- **React Native + Expo**：跨平台移動應用開發
- **TypeScript**：類型安全的 JavaScript
- **React Navigation**：頁面導航管理
- **React Native Web**：支援 Web 端運行
- **Zustand**：輕量級狀態管理

### 後端服務
- **Supabase**：
  - PostgreSQL 數據庫
  - 即時數據同步
  - 身份驗證服務
  - Row Level Security (RLS)
  - Google OAuth 整合

### 數據存儲
- **本地存儲**：AsyncStorage / localStorage
- **雲端數據庫**：Supabase PostgreSQL
- **實時同步**：本地與雲端數據雙向同步
- **衝突解決**：智能數據合併策略

### 容器化部署
- **Docker**：完整環境容器化
- **Kubernetes**：生產級容器編排
- **多環境支援**：開發、測試、生產環境隔離
- **監控系統**：Prometheus + Grafana 監控

## 🚀 快速開始

### 環境要求
- Node.js 18+
- Docker & Docker Compose (推薦)
- npm 或 yarn
- Expo CLI

### 🐳 Docker 快速啟動 (推薦)

1. **克隆項目**
```bash
git clone https://github.com/HOVERTW/ho_money.git
cd ho_money
```

2. **使用 Docker 啟動**
```bash
# Web 開發環境
docker-compose up fintranzo-web

# iOS 模擬器環境
docker-compose up fintranzo-ios-simulator

# 完整生產環境
docker-compose -f docker-compose.production.yml up
```

3. **訪問應用**
- Web: http://localhost
- iOS 模擬器: http://localhost:19000
- 監控面板: http://localhost:3000 (Grafana)

### 📱 本地開發

1. **安裝依賴**
```bash
npm install
```

2. **環境配置**
創建 `.env` 文件：
```env
EXPO_PUBLIC_SUPABASE_URL=https://yrryyapzkgrsahranzvo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_REDIRECT_URL=your_redirect_url
```

3. **啟動開發服務器**
```bash
# Web 版本
npx expo start --web

# 移動端版本
npx expo start
```

4. **訪問應用**
- Web: http://localhost:8081
- 手機: 掃描 QR 碼或使用 Expo Go

## 🐳 Docker 環境模擬

### Web 環境模擬
```bash
# 構建 Web 生產環境
docker build -f docker/Dockerfile.web --target production -t fintranzo-web .

# 運行 Web 環境
docker run -p 80:80 -p 443:443 fintranzo-web

# 訪問: http://localhost (完全模擬 19930913.xyz 環境)
```

### iOS 環境模擬
```bash
# 構建 iOS 模擬器環境
docker build -f docker/Dockerfile.ios-simulator -t fintranzo-ios .

# 運行 iOS 模擬器
docker run -p 19000:19000 -p 8081:8081 fintranzo-ios

# 訪問: http://localhost:19000 (Expo DevTools)
```

### 🎯 Kubernetes 部署

```bash
# 部署到 Kubernetes
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/deployment.yaml

# 檢查部署狀態
kubectl get pods -n fintranzo

# 訪問服務
kubectl port-forward svc/fintranzo-service 8080:80 -n fintranzo
```

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

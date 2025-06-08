# 💰 FinTranzo - 個人財務管理應用

一個功能完整的個人財務管理應用，支援資產負債管理、記帳功能、雲端同步等核心功能。

## 🌟 主要功能

### 📊 資產負債管理
- **多元資產類型**：現金、股票、不動產、保險、加密貨幣等
- **即時價值計算**：自動計算資產當前價值和損益
- **拖拽排序**：支援資產項目的自由排序
- **詳細分類**：按資產類型分組顯示

### 💳 智能記帳系統
- **快速記帳**：支援收入、支出、轉帳記錄
- **帳戶整合**：記帳時可選擇資產帳戶進行扣款
- **分類管理**：豐富的收支分類選項
- **搖一搖功能**：手機搖動快速開啟記帳頁面

### ☁️ 雲端同步
- **Google OAuth 登入**：安全便捷的身份驗證
- **Supabase 後端**：可靠的雲端數據存儲
- **自動同步**：資產和交易數據自動同步到雲端
- **離線支援**：本地存儲確保離線可用

### 📈 數據分析
- **圖表展示**：收支趨勢和資產分布圖表
- **現金流分析**：詳細的現金流入流出分析
- **淨值追蹤**：總資產和淨值變化追蹤

## 🛠️ 技術架構

### 前端技術
- **React Native + Expo**：跨平台移動應用開發
- **TypeScript**：類型安全的 JavaScript
- **React Navigation**：頁面導航管理
- **React Native Web**：支援 Web 端運行

### 後端服務
- **Supabase**：
  - PostgreSQL 數據庫
  - 即時數據同步
  - 身份驗證服務
  - Row Level Security (RLS)

### 數據存儲
- **本地存儲**：AsyncStorage / localStorage
- **雲端數據庫**：Supabase PostgreSQL
- **自動同步**：本地與雲端數據雙向同步

## 🚀 快速開始

### 環境要求
- Node.js 18+
- npm 或 yarn
- Expo CLI

### 安裝步驟

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
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_REDIRECT_URL=your_redirect_url
```

4. **啟動開發服務器**
```bash
npx expo start --web
```

5. **訪問應用**
- Web: http://localhost:8081
- 手機: 掃描 QR 碼

## 📱 部署

### Web 部署 (GitHub Pages)
```bash
npx expo export --platform web
# 部署到 GitHub Pages
```

### 移動端構建
```bash
# iOS
eas build --platform ios --profile preview

# Android
eas build --platform android --profile preview
```

## 🗄️ 數據庫結構

### 主要數據表
- `assets` - 資產數據
- `transactions` - 交易記錄
- `liabilities` - 負債數據
- `exchange_rates` - 匯率數據
- `user_profiles` - 用戶資料

### 數據同步機制
- 本地優先策略
- 自動衝突解決
- 增量同步優化

## 🔧 核心服務

### 資產管理服務
- `assetTransactionSyncService` - 資產與交易同步
- `liabilityService` - 負債管理
- `userProfileService` - 用戶資料管理

### 數據服務
- `transactionDataService` - 交易數據管理
- `userDataSyncService` - 用戶數據同步
- `appInitializationService` - 應用初始化

### 工具服務
- `financialCalculator` - 財務計算
- `storageManager` - 存儲管理
- `forceRefreshManager` - 強制刷新管理

## 🎯 使用指南

### 1. 首次使用
1. 點擊「體驗雲端同步」進行 Google 登入
2. 登入後數據會自動同步到雲端
3. 開始添加您的資產和記錄交易

### 2. 資產管理
1. 進入「資產負債」頁面
2. 點擊「+」添加新資產
3. 選擇資產類型並填寫詳細信息
4. 資產會自動同步到雲端

### 3. 記帳功能
1. 進入「記帳」頁面或搖動手機
2. 選擇交易類型（收入/支出/轉帳）
3. 選擇對應的資產帳戶
4. 填寫金額和備註
5. 交易會自動更新相關資產餘額

### 4. 數據分析
1. 查看「圖表」頁面了解收支趨勢
2. 「現金流」頁面分析資金流向
3. 「儀表板」總覽財務狀況

## 🔒 安全性

- **數據加密**：敏感數據傳輸加密
- **身份驗證**：Google OAuth 安全登入
- **權限控制**：Row Level Security 確保數據隔離
- **本地備份**：重要數據本地備份

## 🤝 貢獻指南

1. Fork 項目
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 許可證

本項目採用 MIT 許可證 - 查看 [LICENSE](LICENSE) 文件了解詳情。

## 🆘 支援

如果您遇到問題或有建議，請：
1. 查看 [Issues](https://github.com/HOVERTW/ho_money/issues)
2. 創建新的 Issue
3. 聯繫開發團隊

## 🎉 致謝

感謝所有為這個項目做出貢獻的開發者和用戶！

---

**FinTranzo** - 讓財務管理變得簡單而智能 💰✨

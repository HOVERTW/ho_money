# FinTranzo - 個人財務管理專家

一款功能強大、用戶體驗卓越的個人財務管理 APP，旨在媲美 Moze 和 MoneyWiz。

## 📈 US 美股數據同步功能

此功能允許用戶同步和查詢美國股票數據，使用 Alpha Vantage API 獲取實時市場數據並存儲在 Supabase 數據庫中。

## 🎯 專案目標

提供簡潔直觀的界面，幫助用戶清晰掌握其完整的資產負債狀況與現金流量。後端採用 Supabase 實現雲端數據同步與用戶管理，並整合指定的 API 自動獲取特定股票市價。

## 🏗️ 技術架構

### 前端框架
- **React Native** - 跨平台移動應用開發
- **Expo SDK 53** - 開發工具鏈和運行時
- **TypeScript** - 類型安全的 JavaScript

### 目標平台
- iOS (手機與平板)
- Android (手機與平板)  
- Web (主流桌面與移動瀏覽器)

### 美股數據同步功能

#### 功能特點
- 自動同步 S&P 500 成分股數據
- 從 Alpha Vantage API 獲取實時股票價格
- 支持按股票代碼或公司名稱搜索
- 提供完整的 RESTful API 接口

#### API 端點

- `GET /api/stocks/sync` - 手動觸發數據同步
- `GET /api/stocks/search?query=AAPL` - 搜索股票
- `GET /api/stocks/AAPL` - 獲取單個股票詳情
- `GET /api/stocks` - 列出所有股票（分頁）

#### 環境變量

創建 `.env` 文件並添加以下變量：

```
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Alpha Vantage
EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key
```

#### 安裝與運行

1. 安裝依賴：
   ```bash
   pip install -r requirements.txt
   ```

2. 運行服務：
   ```bash
   python app.py
   ```

3. 訪問 API 文檔：
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

### 後端服務
- **Supabase** - Backend as a Service
  - 用戶認證 (Authentication)
  - PostgreSQL 數據庫
  - 實時數據同步 (Realtime)
  - 行級安全策略 (RLS)

### 狀態管理與導航
- **Zustand** - 輕量級狀態管理
- **React Navigation** - 導航系統
  - 底部標籤導航 (主要頁面)
  - 堆疊導航 (詳情頁面)

### UI/UX 設計
- **Bento Grid 風格** - 主頁面佈局
- **@expo/vector-icons** - 圖標庫
- **React Native Chart Kit** - 圖表組件
- **Victory Native** - 進階圖表

## 📱 核心功能

### 1. 儀表板 (Dashboard)
- **Bento Grid 佈局**
- 近一年淨資產變化折線圖
- 資產增長 TOP 5
- 資產減損 TOP 5
- 財務摘要卡片

### 2. 記帳 / 交易記錄 (Transactions)
- **月曆視圖** - 主要交易記錄方式
- **列表視圖** - 輔助查看方式
- 手動記帳功能
- 週期性交易設定
- 類別管理系統

### 3. 資產負債表 (Balance Sheet)
- **資產管理**
  - 現金、銀行帳戶
  - 台股 (TWSE API 自動更新)
  - 美股 (Alpha Vantage API 自動更新)
  - 共同基金、加密貨幣
  - 不動產、汽車、保險
- **負債管理**
  - 信用卡、各類貸款
  - 利率與還款追蹤

### 4. 收支分析 (Cash Flow)
- 彈性篩選條件
- 時間範圍選擇
- 交易類型過濾
- 詳細流水帳列表

### 5. 圖表分析 (Charts & Insights)
- 支出類別分析 (圓餅圖)
- 資產配置分析
- 收支趨勢分析 (折線圖)
- 財務健康指標

## 🔌 API 整合

### 美股價格 API
- **服務商**: Alpha Vantage
- **網址**: https://www.alphavantage.co/
- **用途**: 美股股票市價自動更新

### 台股價格 API  
- **服務商**: 臺灣證券交易所 OpenAPI
- **網址**: https://openapi.twse.com.tw/
- **用途**: 台股股票市價自動更新

## 📁 專案結構

```
FinTranzo/
├── src/
│   ├── components/          # 可重用組件
│   ├── screens/            # 頁面組件
│   │   ├── auth/           # 認證相關頁面
│   │   └── main/           # 主要功能頁面
│   ├── navigation/         # 導航配置
│   ├── services/           # API 服務
│   ├── store/              # 狀態管理
│   ├── types/              # TypeScript 類型定義
│   ├── utils/              # 工具函數
│   └── constants/          # 常量定義
├── assets/                 # 靜態資源
├── types/                  # 全局類型定義
└── ...配置文件
```

## 🚀 開發指南

### 環境要求
- Node.js 18+
- npm 或 yarn
- Expo CLI

### 安裝依賴
```bash
npm install
```

### 環境配置
1. 複製 `.env.example` 為 `.env`
2. 配置 Supabase 項目 URL 和 API Key
3. 配置 Alpha Vantage API Key

### 啟動開發服務器
```bash
npm start
# 或
npx expo start
```

### 平台特定啟動
```bash
npm run ios      # iOS 模擬器
npm run android  # Android 模擬器  
npm run web      # Web 瀏覽器
```

## 🔒 安全考量

- 嚴格的 Supabase RLS 規則
- API 金鑰通過環境變量管理
- 用戶數據完全隔離
- 前端輸入驗證

## 📊 開發狀態

### ✅ 已完成
- [x] 專案初始化與依賴安裝
- [x] TypeScript 配置
- [x] 基礎架構設計
- [x] 類型定義系統
- [x] Supabase 服務配置
- [x] 狀態管理 (Zustand)
- [x] 導航系統設計
- [x] 認證頁面 (登錄/註冊/忘記密碼)
- [x] 主要頁面框架
- [x] UI 組件基礎結構

### 🚧 進行中
- [ ] Supabase 數據庫表設計
- [ ] API 整合實現
- [ ] 圖表組件開發
- [ ] 詳細功能實現

### 📋 待開發
- [ ] 單元測試
- [ ] 端對端測試
- [ ] 性能優化
- [ ] 部署配置

## 🤝 貢獻指南

1. Fork 專案
2. 創建功能分支
3. 提交變更
4. 推送到分支
5. 創建 Pull Request

## 📄 授權

本專案採用 MIT 授權條款。

---

**FinTranzo** - 讓財務管理變得簡單而強大 💪

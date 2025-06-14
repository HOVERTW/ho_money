# 🐳 FinTranzo Docker 完整測試和部署指南

## 🎯 **為什麼使用 Docker？**

Docker 確保我們能夠：
- ✅ **100% 環境一致性**：本地、測試、生產環境完全相同
- ✅ **真實測試**：在容器中運行真實的 web 版本
- ✅ **零配置部署**：測試通過後可以直接部署
- ✅ **多平台支持**：同時支持 web 和 iOS 測試
- ✅ **隔離環境**：避免本地環境污染

## 🚀 **快速開始**

### 1. 安裝 Docker
```bash
# Windows/Mac: 下載 Docker Desktop
# Linux: 
sudo apt-get update
sudo apt-get install docker.io docker-compose
```

### 2. 運行完整測試
```bash
# 運行完整的測試套件
npm run docker:test

# 或者直接運行腳本
bash scripts/docker-test.sh
```

### 3. 開發環境
```bash
# Web 開發環境
npm run docker:dev

# iOS 開發環境  
npm run docker:ios

# 生產環境測試
npm run docker:prod
```

## 📋 **測試流程說明**

### 完整測試流程包括：

1. **🔍 環境檢查**
   - 檢查 Docker 是否安裝和運行
   - 驗證 Docker Compose 可用性

2. **🧹 環境清理**
   - 清理舊容器和鏡像
   - 確保乾淨的測試環境

3. **🏗️ 構建測試環境**
   - 構建所有必要的 Docker 鏡像
   - 設置測試網絡和卷

4. **🧪 運行測試套件**
   - **單元測試**：測試個別組件和服務
   - **集成測試**：測試服務間的交互
   - **Web 端到端測試**：測試完整的用戶流程
   - **性能測試**：檢查應用性能
   - **安全測試**：驗證安全性

5. **🏭 生產構建測試**
   - 構建生產版本的 Docker 鏡像
   - 測試生產環境的運行

6. **📊 生成測試報告**
   - 生成詳細的測試報告
   - 包含覆蓋率和性能指標

## 🛠️ **可用的 Docker 命令**

### 開發命令
```bash
# Web 開發環境（熱重載）
docker-compose up web-dev

# iOS 開發環境
docker-compose up ios-dev

# 查看日誌
docker-compose logs -f web-dev
```

### 測試命令
```bash
# 運行所有測試
docker-compose -f docker/docker-compose.test.yml up

# 運行特定測試
docker-compose -f docker/docker-compose.test.yml run --rm full-test
docker-compose -f docker/docker-compose.test.yml run --rm web-e2e
docker-compose -f docker/docker-compose.test.yml run --rm performance-test
```

### 生產命令
```bash
# 構建生產鏡像
docker-compose build web-prod

# 運行生產環境
docker-compose up web-prod

# 檢查健康狀態
curl http://localhost/health
```

## 🔧 **配置說明**

### 環境變量
- `.env` - 開發環境配置
- `.env.test` - 測試環境配置
- `.env.production` - 生產環境配置

### Docker 配置文件
- `Dockerfile` - 多階段構建配置
- `docker-compose.yml` - 主要服務配置
- `docker/docker-compose.test.yml` - 測試專用配置
- `docker/nginx.conf` - Nginx 生產配置

## 📊 **測試結果解讀**

### 成功標準
所有以下測試都必須通過：
- ✅ 單元測試：100% 通過
- ✅ 集成測試：數據庫連接和 API 正常
- ✅ Web E2E 測試：用戶流程完整
- ✅ 性能測試：響應時間 < 2秒
- ✅ 安全測試：無安全漏洞
- ✅ 生產構建：成功構建並運行

### 失敗處理
如果任何測試失敗：
1. 查看詳細的測試報告
2. 檢查 Docker 容器日誌
3. 修復問題後重新運行測試
4. 確保所有測試通過後才部署

## 🚀 **部署流程**

### 1. 本地測試通過
```bash
npm run docker:test
# 確保所有測試都通過
```

### 2. 構建生產鏡像
```bash
docker-compose build web-prod
```

### 3. 本地生產測試
```bash
docker-compose up web-prod
# 訪問 http://localhost 測試
```

### 4. 部署到生產環境
```bash
# 推送到 Docker Registry
docker tag fintranzo_web-prod your-registry/fintranzo:latest
docker push your-registry/fintranzo:latest

# 或者直接部署到 GitHub Pages
npm run deploy
```

## 🐛 **故障排除**

### 常見問題

1. **Docker 服務未運行**
   ```bash
   # Windows/Mac: 啟動 Docker Desktop
   # Linux:
   sudo systemctl start docker
   ```

2. **端口被占用**
   ```bash
   # 查看端口使用
   netstat -tulpn | grep :19006
   
   # 停止占用進程
   docker-compose down
   ```

3. **鏡像構建失敗**
   ```bash
   # 清理 Docker 緩存
   docker system prune -a
   
   # 重新構建
   docker-compose build --no-cache
   ```

4. **測試超時**
   ```bash
   # 增加測試超時時間
   export TEST_TIMEOUT=60000
   npm run docker:test
   ```

## 📈 **性能優化**

### Docker 優化
- 使用多階段構建減少鏡像大小
- 利用 Docker 層緩存加速構建
- 使用 .dockerignore 排除不必要文件

### 測試優化
- 並行運行獨立測試
- 使用測試數據庫避免污染
- 緩存依賴減少安裝時間

## 🔒 **安全考慮**

- 不在 Docker 鏡像中包含敏感信息
- 使用環境變量管理配置
- 定期更新基礎鏡像
- 掃描鏡像安全漏洞

## 📞 **支持**

如果遇到問題：
1. 查看 Docker 日誌：`docker-compose logs`
2. 檢查測試報告：`./test-reports/`
3. 參考故障排除部分
4. 聯繫開發團隊

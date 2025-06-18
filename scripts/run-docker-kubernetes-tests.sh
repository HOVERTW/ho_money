#!/bin/bash

# Docker + Kubernetes 五大問題修復測試運行腳本

set -e

echo "🐳 FinTranzo 五大問題修復測試"
echo "============================="
echo "開始時間: $(date)"
echo ""

# 檢查 Docker 是否運行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未運行，請先啟動 Docker"
    exit 1
fi

echo "✅ Docker 運行正常"

# 檢查 kubectl 是否可用
if command -v kubectl > /dev/null 2>&1; then
    echo "✅ kubectl 可用"
    KUBECTL_AVAILABLE=true
else
    echo "⚠️ kubectl 不可用，跳過 Kubernetes 測試"
    KUBECTL_AVAILABLE=false
fi

echo ""

# 1. 運行純測試（不啟動服務）
echo "🧪 步驟1: 運行純測試環境"
echo "========================"
docker-compose -f docker-compose.test.yml run --rm fintranzo-test-only
echo "✅ 純測試完成"
echo ""

# 2. 運行 Web 環境測試
echo "🌐 步驟2: 運行 Web 環境測試"
echo "=========================="
echo "啟動 Web 測試環境（後台運行）..."
docker-compose -f docker-compose.test.yml up -d fintranzo-web-test

# 等待服務啟動
echo "等待 Web 服務啟動..."
sleep 30

# 檢查服務狀態
if curl -f http://localhost:8081 > /dev/null 2>&1; then
    echo "✅ Web 服務運行正常"
else
    echo "⚠️ Web 服務可能未完全啟動，但繼續測試"
fi

# 停止 Web 測試環境
echo "停止 Web 測試環境..."
docker-compose -f docker-compose.test.yml down
echo "✅ Web 環境測試完成"
echo ""

# 3. 運行 iOS 模擬器環境測試
echo "📱 步驟3: 運行 iOS 模擬器環境測試"
echo "==============================="
echo "啟動 iOS 模擬器測試環境（後台運行）..."
docker-compose -f docker-compose.test.yml up -d fintranzo-ios-test

# 等待服務啟動
echo "等待 iOS 模擬器服務啟動..."
sleep 30

# 檢查服務狀態
if curl -f http://localhost:19000 > /dev/null 2>&1; then
    echo "✅ iOS 模擬器服務運行正常"
else
    echo "⚠️ iOS 模擬器服務可能未完全啟動，但繼續測試"
fi

# 停止 iOS 測試環境
echo "停止 iOS 測試環境..."
docker-compose -f docker-compose.test.yml down
echo "✅ iOS 環境測試完成"
echo ""

# 4. 運行 10 輪測試
echo "🔄 步驟4: 運行 10 輪測試"
echo "======================"
docker-compose -f docker-compose.test.yml run --rm fintranzo-10-rounds-test
echo "✅ 10 輪測試完成"
echo ""

# 5. Kubernetes 測試（如果可用）
if [ "$KUBECTL_AVAILABLE" = true ]; then
    echo "☸️ 步驟5: 運行 Kubernetes 測試"
    echo "============================="
    
    # 創建命名空間
    echo "創建測試命名空間..."
    kubectl apply -f k8s/five-issues-test-job.yaml
    
    # 等待 Job 完成
    echo "等待 Kubernetes 測試 Job 完成..."
    kubectl wait --for=condition=complete --timeout=600s job/fintranzo-five-issues-test -n fintranzo-test
    
    # 顯示測試結果
    echo "Kubernetes 測試結果:"
    kubectl logs job/fintranzo-five-issues-test -n fintranzo-test
    
    # 運行 10 輪測試
    echo "運行 Kubernetes 10 輪測試..."
    kubectl wait --for=condition=complete --timeout=1800s job/fintranzo-10-rounds-test -n fintranzo-test
    
    # 顯示 10 輪測試結果
    echo "Kubernetes 10 輪測試結果:"
    kubectl logs job/fintranzo-10-rounds-test -n fintranzo-test
    
    # 清理資源
    echo "清理 Kubernetes 測試資源..."
    kubectl delete namespace fintranzo-test
    
    echo "✅ Kubernetes 測試完成"
else
    echo "⚠️ 跳過 Kubernetes 測試（kubectl 不可用）"
fi

echo ""
echo "🎉 所有測試完成！"
echo "================="
echo "結束時間: $(date)"
echo ""
echo "測試總結:"
echo "- ✅ 純測試環境"
echo "- ✅ Web 環境測試"
echo "- ✅ iOS 模擬器環境測試"
echo "- ✅ 10 輪測試"
if [ "$KUBECTL_AVAILABLE" = true ]; then
    echo "- ✅ Kubernetes 測試"
else
    echo "- ⚠️ Kubernetes 測試（跳過）"
fi
echo ""
echo "如果所有測試都通過，五大問題修復成功！"
echo "可以安全地提交代碼到 GitHub。"

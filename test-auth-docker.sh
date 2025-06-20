#!/bin/bash

# FinTranzo 認證功能 Docker 測試腳本

echo "🐳 FinTranzo 認證功能 Docker 測試"
echo "================================="
echo ""

# 檢查 Docker 是否安裝
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安裝，請先安裝 Docker"
    exit 1
fi

# 檢查 Docker Compose 是否安裝
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安裝，請先安裝 Docker Compose"
    exit 1
fi

echo "✅ Docker 環境檢查通過"
echo ""

# 清理舊容器
echo "🧹 清理舊容器..."
docker-compose -f docker-compose.auth-test.yml down --remove-orphans 2>/dev/null || true
docker system prune -f 2>/dev/null || true

echo ""
echo "🔧 選擇測試模式:"
echo "1. 快速認證測試（推薦）"
echo "2. Web 環境測試（帶 UI）"
echo "3. 用戶確認工具"
echo "4. 多輪壓力測試"
echo "5. 全部測試"
echo ""

read -p "請選擇 (1-5): " choice

case $choice in
    1)
        echo "🧪 運行快速認證測試..."
        echo ""
        docker-compose -f docker-compose.auth-test.yml run --rm fintranzo-auth-test
        ;;
    2)
        echo "🌐 啟動 Web 環境測試..."
        echo ""
        echo "📝 說明:"
        echo "- 容器將啟動 Web 服務"
        echo "- 訪問 http://localhost:3000 進行手動測試"
        echo "- 按 Ctrl+C 停止服務"
        echo ""
        docker-compose -f docker-compose.auth-test.yml up fintranzo-auth-web-test
        ;;
    3)
        echo "🔧 啟動用戶確認工具..."
        echo ""
        echo "📝 說明:"
        echo "- 容器將保持運行狀態"
        echo "- 使用以下命令確認用戶:"
        echo "  docker-compose -f docker-compose.auth-test.yml exec fintranzo-user-confirm node scripts/confirm-user.js confirm email@example.com"
        echo "- 按 Ctrl+C 停止服務"
        echo ""
        docker-compose -f docker-compose.auth-test.yml up fintranzo-user-confirm
        ;;
    4)
        echo "🔄 運行多輪壓力測試..."
        echo ""
        docker-compose -f docker-compose.auth-test.yml run --rm fintranzo-auth-stress-test
        ;;
    5)
        echo "🎯 運行全部測試..."
        echo ""
        
        echo "📊 測試1: 快速認證測試"
        echo "======================"
        docker-compose -f docker-compose.auth-test.yml run --rm fintranzo-auth-test
        test1_result=$?
        
        echo ""
        echo "📊 測試2: 多輪壓力測試"
        echo "======================"
        docker-compose -f docker-compose.auth-test.yml run --rm fintranzo-auth-stress-test
        test2_result=$?
        
        echo ""
        echo "📊 測試結果總結"
        echo "=============="
        echo "快速認證測試: $([ $test1_result -eq 0 ] && echo '✅ 通過' || echo '❌ 失敗')"
        echo "多輪壓力測試: $([ $test2_result -eq 0 ] && echo '✅ 通過' || echo '❌ 失敗')"
        
        if [ $test1_result -eq 0 ] && [ $test2_result -eq 0 ]; then
            echo ""
            echo "🎉 所有測試通過！認證系統工作正常"
        else
            echo ""
            echo "⚠️ 部分測試失敗，請檢查上面的錯誤信息"
        fi
        ;;
    *)
        echo "❌ 無效選擇"
        exit 1
        ;;
esac

echo ""
echo "🧹 清理容器..."
docker-compose -f docker-compose.auth-test.yml down --remove-orphans 2>/dev/null || true

echo ""
echo "✅ 測試完成"

# 顯示修復建議
echo ""
echo "💡 如果測試失敗，請嘗試以下修復方法:"
echo ""
echo "1. 手動確認用戶（最快）:"
echo "   - 前往 https://supabase.com/dashboard"
echo "   - Authentication > Users"
echo "   - 找到用戶並點擊 'Confirm email'"
echo ""
echo "2. 禁用郵件確認:"
echo "   - 前往 Authentication > Settings"
echo "   - 關閉 'Enable email confirmations'"
echo ""
echo "3. 使用確認工具:"
echo "   ./test-auth-docker.sh 然後選擇選項 3"
echo ""
echo "4. 查看詳細日誌:"
echo "   docker-compose -f docker-compose.auth-test.yml logs"

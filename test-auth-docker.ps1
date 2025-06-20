# FinTranzo 認證功能 Docker 測試腳本 (PowerShell)

Write-Host "🐳 FinTranzo 認證功能 Docker 測試" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# 檢查 Docker 是否安裝
try {
    docker --version | Out-Null
    Write-Host "✅ Docker 已安裝" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker 未安裝，請先安裝 Docker Desktop" -ForegroundColor Red
    exit 1
}

# 檢查 Docker Compose 是否安裝
try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose 已安裝" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose 未安裝，請先安裝 Docker Compose" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 清理舊容器
Write-Host "🧹 清理舊容器..." -ForegroundColor Yellow
try {
    docker-compose -f docker-compose.auth-test.yml down --remove-orphans 2>$null
    docker system prune -f 2>$null
} catch {
    # 忽略清理錯誤
}

Write-Host ""
Write-Host "🔧 選擇測試模式:" -ForegroundColor Cyan
Write-Host "1. 快速認證測試（推薦）"
Write-Host "2. Web 環境測試（帶 UI）"
Write-Host "3. 用戶確認工具"
Write-Host "4. 多輪壓力測試"
Write-Host "5. 全部測試"
Write-Host ""

$choice = Read-Host "請選擇 (1-5)"

switch ($choice) {
    "1" {
        Write-Host "🧪 運行快速認證測試..." -ForegroundColor Yellow
        Write-Host ""
        docker-compose -f docker-compose.auth-test.yml run --rm fintranzo-auth-test
        $testResult = $LASTEXITCODE
    }
    "2" {
        Write-Host "🌐 啟動 Web 環境測試..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "📝 說明:" -ForegroundColor Cyan
        Write-Host "- 容器將啟動 Web 服務"
        Write-Host "- 訪問 http://localhost:3000 進行手動測試"
        Write-Host "- 按 Ctrl+C 停止服務"
        Write-Host ""
        docker-compose -f docker-compose.auth-test.yml up fintranzo-auth-web-test
        $testResult = $LASTEXITCODE
    }
    "3" {
        Write-Host "🔧 啟動用戶確認工具..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "📝 說明:" -ForegroundColor Cyan
        Write-Host "- 容器將保持運行狀態"
        Write-Host "- 使用以下命令確認用戶:"
        Write-Host "  docker-compose -f docker-compose.auth-test.yml exec fintranzo-user-confirm node scripts/confirm-user.js confirm email@example.com"
        Write-Host "- 按 Ctrl+C 停止服務"
        Write-Host ""
        docker-compose -f docker-compose.auth-test.yml up fintranzo-user-confirm
        $testResult = $LASTEXITCODE
    }
    "4" {
        Write-Host "🔄 運行多輪壓力測試..." -ForegroundColor Yellow
        Write-Host ""
        docker-compose -f docker-compose.auth-test.yml run --rm fintranzo-auth-stress-test
        $testResult = $LASTEXITCODE
    }
    "5" {
        Write-Host "🎯 運行全部測試..." -ForegroundColor Yellow
        Write-Host ""
        
        Write-Host "📊 測試1: 快速認證測試" -ForegroundColor Cyan
        Write-Host "======================"
        docker-compose -f docker-compose.auth-test.yml run --rm fintranzo-auth-test
        $test1Result = $LASTEXITCODE
        
        Write-Host ""
        Write-Host "📊 測試2: 多輪壓力測試" -ForegroundColor Cyan
        Write-Host "======================"
        docker-compose -f docker-compose.auth-test.yml run --rm fintranzo-auth-stress-test
        $test2Result = $LASTEXITCODE
        
        Write-Host ""
        Write-Host "📊 測試結果總結" -ForegroundColor Cyan
        Write-Host "=============="
        
        if ($test1Result -eq 0) {
            Write-Host "快速認證測試: ✅ 通過" -ForegroundColor Green
        } else {
            Write-Host "快速認證測試: ❌ 失敗" -ForegroundColor Red
        }
        
        if ($test2Result -eq 0) {
            Write-Host "多輪壓力測試: ✅ 通過" -ForegroundColor Green
        } else {
            Write-Host "多輪壓力測試: ❌ 失敗" -ForegroundColor Red
        }
        
        if ($test1Result -eq 0 -and $test2Result -eq 0) {
            Write-Host ""
            Write-Host "🎉 所有測試通過！認證系統工作正常" -ForegroundColor Green
            $testResult = 0
        } else {
            Write-Host ""
            Write-Host "⚠️ 部分測試失敗，請檢查上面的錯誤信息" -ForegroundColor Yellow
            $testResult = 1
        }
    }
    default {
        Write-Host "❌ 無效選擇" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🧹 清理容器..." -ForegroundColor Yellow
try {
    docker-compose -f docker-compose.auth-test.yml down --remove-orphans 2>$null
} catch {
    # 忽略清理錯誤
}

Write-Host ""
Write-Host "✅ 測試完成" -ForegroundColor Green

# 顯示修復建議
Write-Host ""
Write-Host "💡 如果測試失敗，請嘗試以下修復方法:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 手動確認用戶（最快）:" -ForegroundColor Yellow
Write-Host "   - 前往 https://supabase.com/dashboard"
Write-Host "   - Authentication > Users"
Write-Host "   - 找到用戶並點擊 'Confirm email'"
Write-Host ""
Write-Host "2. 禁用郵件確認:" -ForegroundColor Yellow
Write-Host "   - 前往 Authentication > Settings"
Write-Host "   - 關閉 'Enable email confirmations'"
Write-Host ""
Write-Host "3. 使用確認工具:" -ForegroundColor Yellow
Write-Host "   .\test-auth-docker.ps1 然後選擇選項 3"
Write-Host ""
Write-Host "4. 查看詳細日誌:" -ForegroundColor Yellow
Write-Host "   docker-compose -f docker-compose.auth-test.yml logs"

if ($testResult -ne 0) {
    exit $testResult
}

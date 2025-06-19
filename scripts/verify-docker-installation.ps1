# Docker 安裝驗證腳本
Write-Host "Docker 安裝驗證" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan

# 檢查 Docker 版本
Write-Host "`n檢查 Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker 命令不可用" -ForegroundColor Red
    Write-Host "請確認 Docker Desktop 已安裝並啟動" -ForegroundColor Yellow
}

# 檢查 Docker Compose
Write-Host "`n檢查 Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker compose version
    Write-Host "✅ Docker Compose: $composeVersion" -ForegroundColor Green
} catch {
    try {
        $composeVersion = docker-compose --version
        Write-Host "✅ Docker Compose: $composeVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Docker Compose 不可用" -ForegroundColor Red
    }
}

# 檢查 Kubernetes
Write-Host "`n檢查 Kubernetes..." -ForegroundColor Yellow
try {
    $kubectlVersion = kubectl version --client --short
    Write-Host "✅ Kubectl: $kubectlVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Kubernetes 未啟用" -ForegroundColor Yellow
    Write-Host "請在 Docker Desktop 設置中啟用 Kubernetes" -ForegroundColor Yellow
}

# 測試 Docker 運行
Write-Host "`n測試 Docker 運行..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info --format "{{.ServerVersion}}"
    Write-Host "✅ Docker Engine: $dockerInfo" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Engine 未運行" -ForegroundColor Red
}

Write-Host "`n驗證完成" -ForegroundColor Green

# Docker Desktop 直接下載安裝腳本
# 適用於無法使用 Chocolatey 的情況

Write-Host "🚀 Docker Desktop 直接安裝" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# 檢查管理員權限
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ 需要管理員權限" -ForegroundColor Red
    Write-Host "請以管理員身份運行 PowerShell" -ForegroundColor Yellow
    pause
    exit 1
}

# 步驟1: 下載 Docker Desktop
Write-Host "`n📥 步驟1: 下載 Docker Desktop..." -ForegroundColor Cyan

$downloadUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
$installerPath = "$env:TEMP\DockerDesktopInstaller.exe"

try {
    Write-Host "正在下載 Docker Desktop..." -ForegroundColor Yellow
    Write-Host "下載地址: $downloadUrl" -ForegroundColor Gray
    
    # 使用 Invoke-WebRequest 下載
    Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing
    
    if (Test-Path $installerPath) {
        $fileSize = (Get-Item $installerPath).Length / 1MB
        Write-Host "✅ 下載完成，檔案大小: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Green
    } else {
        throw "下載失敗"
    }
} catch {
    Write-Host "❌ 下載失敗: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "請手動下載 Docker Desktop:" -ForegroundColor Yellow
    Write-Host "https://www.docker.com/products/docker-desktop/" -ForegroundColor Blue
    pause
    exit 1
}

# 步驟2: 安裝 Docker Desktop
Write-Host "`n🔧 步驟2: 安裝 Docker Desktop..." -ForegroundColor Cyan
try {
    Write-Host "正在執行安裝程序..." -ForegroundColor Yellow
    Write-Host "這可能需要幾分鐘時間" -ForegroundColor Yellow
    
    # 執行安裝程序
    $installProcess = Start-Process -FilePath $installerPath -ArgumentList "install", "--quiet" -Wait -PassThru
    
    if ($installProcess.ExitCode -eq 0) {
        Write-Host "✅ Docker Desktop 安裝完成" -ForegroundColor Green
    } else {
        Write-Host "⚠️ 安裝程序退出碼: $($installProcess.ExitCode)" -ForegroundColor Yellow
        Write-Host "安裝可能需要手動完成" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ 安裝失敗: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "請手動運行安裝程序: $installerPath" -ForegroundColor Yellow
}

# 步驟3: 清理下載檔案
Write-Host "`n🧹 步驟3: 清理臨時檔案..." -ForegroundColor Cyan
try {
    if (Test-Path $installerPath) {
        Remove-Item $installerPath -Force
        Write-Host "✅ 臨時檔案已清理" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ 清理臨時檔案失敗" -ForegroundColor Yellow
}

# 步驟4: 啟動 Docker Desktop
Write-Host "`n🚀 步驟4: 啟動 Docker Desktop..." -ForegroundColor Cyan
try {
    $dockerDesktopPaths = @(
        "C:\Program Files\Docker\Docker\Docker Desktop.exe",
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
    )
    
    $dockerDesktopFound = $false
    foreach ($path in $dockerDesktopPaths) {
        if (Test-Path $path) {
            Write-Host "找到 Docker Desktop: $path" -ForegroundColor Green
            Start-Process -FilePath $path
            $dockerDesktopFound = $true
            break
        }
    }
    
    if (-not $dockerDesktopFound) {
        Write-Host "⚠️ 未找到 Docker Desktop" -ForegroundColor Yellow
        Write-Host "請從開始菜單手動啟動 Docker Desktop" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Docker Desktop 啟動中..." -ForegroundColor Green
    }
} catch {
    Write-Host "❌ 啟動失敗: $($_.Exception.Message)" -ForegroundColor Red
}

# 步驟5: 等待啟動
Write-Host "`n⏳ 步驟5: 等待 Docker 啟動..." -ForegroundColor Cyan
Write-Host "首次啟動可能需要較長時間，請耐心等待" -ForegroundColor Yellow
Write-Host "Docker Desktop 會顯示系統托盤圖標" -ForegroundColor Yellow

# 等待並檢查
for ($i = 1; $i -le 12; $i++) {
    Write-Host "等待中... ($i/12)" -ForegroundColor Gray
    Start-Sleep -Seconds 10
    
    # 檢查 Docker 進程
    $dockerProcess = Get-Process -Name "*docker*" -ErrorAction SilentlyContinue
    if ($dockerProcess) {
        Write-Host "✅ 檢測到 Docker 進程" -ForegroundColor Green
        break
    }
}

# 最終檢查
Write-Host "`n✅ 安裝完成檢查" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan

# 檢查安裝路徑
$dockerInstalled = $false
$dockerPaths = @(
    "C:\Program Files\Docker\Docker\Docker Desktop.exe",
    "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
)

foreach ($path in $dockerPaths) {
    if (Test-Path $path) {
        Write-Host "✅ Docker Desktop 已安裝: $path" -ForegroundColor Green
        $dockerInstalled = $true
        break
    }
}

if ($dockerInstalled) {
    Write-Host "`n🎯 下一步操作:" -ForegroundColor Cyan
    Write-Host "1. 等待 Docker Desktop 完全啟動" -ForegroundColor Yellow
    Write-Host "2. 在 Docker Desktop 設置中啟用 Kubernetes" -ForegroundColor Yellow
    Write-Host "3. 重新啟動 PowerShell" -ForegroundColor Yellow
    Write-Host "4. 測試命令: docker --version" -ForegroundColor Yellow
    
    Write-Host "`n📝 重要提醒:" -ForegroundColor Cyan
    Write-Host "- Docker Desktop 首次啟動需要下載基礎映像" -ForegroundColor Yellow
    Write-Host "- 可能需要重新啟動電腦" -ForegroundColor Yellow
    Write-Host "- 確保 Windows 功能中的 Hyper-V 已啟用" -ForegroundColor Yellow
} else {
    Write-Host "❌ Docker Desktop 安裝可能失敗" -ForegroundColor Red
    Write-Host "請手動下載並安裝:" -ForegroundColor Yellow
    Write-Host "https://www.docker.com/products/docker-desktop/" -ForegroundColor Blue
}

Write-Host "`n✅ 安裝腳本執行完成" -ForegroundColor Green

# Docker Desktop 自動安裝腳本 (使用 Chocolatey)
# 這是最容易讓 AI 調用的安裝方式

Write-Host "🚀 Docker Desktop 自動安裝" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# 檢查是否以管理員身份運行
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ 需要管理員權限" -ForegroundColor Red
    Write-Host "請以管理員身份運行 PowerShell" -ForegroundColor Yellow
    Write-Host "右鍵點擊 PowerShell -> 以管理員身份運行" -ForegroundColor Yellow
    pause
    exit 1
}

# 步驟1: 安裝 Chocolatey (如果未安裝)
Write-Host "`n📦 步驟1: 檢查 Chocolatey..." -ForegroundColor Cyan
try {
    $chocoVersion = choco --version 2>$null
    if ($chocoVersion) {
        Write-Host "✅ Chocolatey 已安裝: $chocoVersion" -ForegroundColor Green
    } else {
        throw "Chocolatey not found"
    }
} catch {
    Write-Host "⚠️ Chocolatey 未安裝，正在安裝..." -ForegroundColor Yellow
    
    # 設置執行策略
    Set-ExecutionPolicy Bypass -Scope Process -Force
    
    # 安裝 Chocolatey
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    
    # 重新載入環境變量
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Host "✅ Chocolatey 安裝完成" -ForegroundColor Green
}

# 步驟2: 安裝 Docker Desktop
Write-Host "`n🐳 步驟2: 安裝 Docker Desktop..." -ForegroundColor Cyan
try {
    Write-Host "正在下載並安裝 Docker Desktop..." -ForegroundColor Yellow
    choco install docker-desktop -y
    Write-Host "✅ Docker Desktop 安裝完成" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Desktop 安裝失敗: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "請手動安裝 Docker Desktop" -ForegroundColor Yellow
    exit 1
}

# 步驟3: 啟動 Docker Desktop
Write-Host "`n🚀 步驟3: 啟動 Docker Desktop..." -ForegroundColor Cyan
try {
    # 查找 Docker Desktop 執行檔
    $dockerDesktopPaths = @(
        "C:\Program Files\Docker\Docker\Docker Desktop.exe",
        "C:\Users\$env:USERNAME\AppData\Local\Docker\Docker Desktop.exe",
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
        Write-Host "⚠️ 未找到 Docker Desktop 執行檔" -ForegroundColor Yellow
        Write-Host "請手動啟動 Docker Desktop" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Docker Desktop 啟動中..." -ForegroundColor Green
    }
} catch {
    Write-Host "❌ 啟動 Docker Desktop 失敗: $($_.Exception.Message)" -ForegroundColor Red
}

# 步驟4: 等待 Docker 啟動
Write-Host "`n⏳ 步驟4: 等待 Docker 啟動 (60秒)..." -ForegroundColor Cyan
Write-Host "Docker Desktop 首次啟動可能需要較長時間" -ForegroundColor Yellow
Start-Sleep -Seconds 60

# 步驟5: 驗證安裝
Write-Host "`n✅ 步驟5: 驗證安裝..." -ForegroundColor Cyan

# 檢查 Docker 命令
$dockerExePaths = @(
    "C:\Program Files\Docker\Docker\resources\bin\docker.exe",
    "$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe"
)

$dockerWorking = $false
foreach ($path in $dockerExePaths) {
    if (Test-Path $path) {
        try {
            $version = & $path --version 2>$null
            if ($version) {
                Write-Host "🐳 Docker 版本: $version" -ForegroundColor Green
                $dockerWorking = $true
                
                # 添加到 PATH
                $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
                $dockerBinPath = Split-Path $path
                if ($currentPath -notlike "*$dockerBinPath*") {
                    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$dockerBinPath", "User")
                    Write-Host "✅ Docker 已添加到 PATH" -ForegroundColor Green
                }
                break
            }
        } catch {
            continue
        }
    }
}

# 檢查 Docker Compose
try {
    if ($dockerWorking) {
        $composePath = Split-Path $path
        $composeExe = Join-Path $composePath "docker-compose.exe"
        if (Test-Path $composeExe) {
            $composeVersion = & $composeExe --version 2>$null
            Write-Host "🐙 Docker Compose 版本: $composeVersion" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "⚠️ Docker Compose 檢查失敗" -ForegroundColor Yellow
}

# 最終結果
Write-Host "`n📊 安裝結果" -ForegroundColor Cyan
Write-Host "==========" -ForegroundColor Cyan

if ($dockerWorking) {
    Write-Host "✅ Docker Desktop: 安裝成功並可用" -ForegroundColor Green
    Write-Host "✅ 可以開始使用 Docker 命令" -ForegroundColor Green
    
    Write-Host "`n🎯 下一步操作:" -ForegroundColor Cyan
    Write-Host "1. 在 Docker Desktop 中啟用 Kubernetes" -ForegroundColor Yellow
    Write-Host "2. 重新啟動 PowerShell 以載入新的 PATH" -ForegroundColor Yellow
    Write-Host "3. 運行測試命令: docker --version" -ForegroundColor Yellow
    
} else {
    Write-Host "❌ Docker Desktop: 安裝可能未完成" -ForegroundColor Red
    Write-Host "請檢查 Docker Desktop 是否正在運行" -ForegroundColor Yellow
    Write-Host "可能需要重新啟動電腦" -ForegroundColor Yellow
}

Write-Host "`n✅ 安裝腳本執行完成" -ForegroundColor Green
Write-Host "如有問題，請重新啟動電腦後再次嘗試" -ForegroundColor Yellow

# Docker + Kubernetes 環境檢查腳本
# 檢查並設置 Docker 和 Kubernetes 環境

Write-Host "🔍 Docker + Kubernetes 環境檢查" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# 檢查 Docker Desktop 是否安裝
$dockerPaths = @(
    "C:\Program Files\Docker\Docker\Docker Desktop.exe",
    "C:\Users\$env:USERNAME\AppData\Local\Docker\Docker Desktop.exe",
    "C:\Program Files\Docker\Docker\resources\bin\docker.exe",
    "C:\Users\$env:USERNAME\AppData\Local\Docker\resources\bin\docker.exe"
)

$dockerFound = $false
foreach ($path in $dockerPaths) {
    if (Test-Path $path) {
        Write-Host "✅ 找到 Docker: $path" -ForegroundColor Green
        $dockerFound = $true
        break
    }
}

if (-not $dockerFound) {
    Write-Host "❌ 未找到 Docker Desktop" -ForegroundColor Red
    Write-Host "請確認 Docker Desktop 已安裝並啟動" -ForegroundColor Yellow
}

# 檢查 Docker 服務是否運行
Write-Host "`n🔍 檢查 Docker 服務..." -ForegroundColor Cyan
try {
    $dockerService = Get-Service -Name "*docker*" -ErrorAction SilentlyContinue
    if ($dockerService) {
        foreach ($service in $dockerService) {
            Write-Host "📋 Docker 服務: $($service.Name) - 狀態: $($service.Status)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️ 未找到 Docker 服務" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ 檢查 Docker 服務時發生錯誤: $($_.Exception.Message)" -ForegroundColor Red
}

# 檢查 Docker 進程
Write-Host "`n🔍 檢查 Docker 進程..." -ForegroundColor Cyan
try {
    $dockerProcesses = Get-Process -Name "*docker*" -ErrorAction SilentlyContinue
    if ($dockerProcesses) {
        foreach ($process in $dockerProcesses) {
            Write-Host "🔄 Docker 進程: $($process.Name) - PID: $($process.Id)" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️ 未找到 Docker 進程" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ 檢查 Docker 進程時發生錯誤: $($_.Exception.Message)" -ForegroundColor Red
}

# 嘗試啟動 Docker Desktop
Write-Host "`n🚀 嘗試啟動 Docker Desktop..." -ForegroundColor Cyan
$dockerDesktopPaths = @(
    "C:\Program Files\Docker\Docker\Docker Desktop.exe",
    "C:\Users\$env:USERNAME\AppData\Local\Docker\Docker Desktop.exe"
)

foreach ($path in $dockerDesktopPaths) {
    if (Test-Path $path) {
        try {
            Write-Host "🔄 啟動 Docker Desktop: $path" -ForegroundColor Yellow
            Start-Process -FilePath $path -WindowStyle Hidden
            Write-Host "✅ Docker Desktop 啟動命令已執行" -ForegroundColor Green
            break
        } catch {
            Write-Host "❌ 啟動 Docker Desktop 失敗: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# 等待 Docker 啟動
Write-Host "`n⏳ 等待 Docker 啟動 (30秒)..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# 重新檢查 Docker 命令
Write-Host "`n🔍 重新檢查 Docker 命令..." -ForegroundColor Cyan
try {
    # 嘗試直接路徑
    $dockerExePaths = @(
        "C:\Program Files\Docker\Docker\resources\bin\docker.exe",
        "C:\Users\$env:USERNAME\AppData\Local\Docker\resources\bin\docker.exe"
    )
    
    $dockerExeFound = $false
    foreach ($path in $dockerExePaths) {
        if (Test-Path $path) {
            Write-Host "✅ 找到 Docker 執行檔: $path" -ForegroundColor Green
            try {
                $version = & $path --version
                Write-Host "🐳 Docker 版本: $version" -ForegroundColor Green
                $dockerExeFound = $true
                
                # 設置別名
                Set-Alias -Name docker -Value $path -Scope Global
                Write-Host "✅ 已設置 Docker 別名" -ForegroundColor Green
                break
            } catch {
                Write-Host "❌ 執行 Docker 命令失敗: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
    
    if (-not $dockerExeFound) {
        Write-Host "❌ 無法找到可用的 Docker 執行檔" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ 檢查 Docker 命令時發生錯誤: $($_.Exception.Message)" -ForegroundColor Red
}

# 檢查 kubectl
Write-Host "`n🔍 檢查 Kubernetes (kubectl)..." -ForegroundColor Cyan
try {
    $kubectlPaths = @(
        "kubectl",
        "C:\Program Files\Docker\Docker\resources\bin\kubectl.exe",
        "C:\Users\$env:USERNAME\.kube\kubectl.exe"
    )
    
    $kubectlFound = $false
    foreach ($path in $kubectlPaths) {
        try {
            if ($path -eq "kubectl") {
                $version = kubectl version --client --short 2>$null
            } else {
                if (Test-Path $path) {
                    $version = & $path version --client --short 2>$null
                } else {
                    continue
                }
            }
            Write-Host "☸️ Kubectl 版本: $version" -ForegroundColor Green
            $kubectlFound = $true
            break
        } catch {
            continue
        }
    }
    
    if (-not $kubectlFound) {
        Write-Host "⚠️ 未找到 kubectl 或 Kubernetes 未啟用" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ 檢查 kubectl 時發生錯誤: $($_.Exception.Message)" -ForegroundColor Red
}

# 檢查 Docker Compose
Write-Host "`n🔍 檢查 Docker Compose..." -ForegroundColor Cyan
try {
    $composeFound = $false
    
    # 嘗試 docker compose (新版本)
    try {
        if (Get-Command docker -ErrorAction SilentlyContinue) {
            $composeVersion = docker compose version 2>$null
            if ($composeVersion) {
                Write-Host "🐙 Docker Compose 版本: $composeVersion" -ForegroundColor Green
                $composeFound = $true
            }
        }
    } catch {}
    
    # 嘗試 docker-compose (舊版本)
    if (-not $composeFound) {
        try {
            $composeVersion = docker-compose --version 2>$null
            if ($composeVersion) {
                Write-Host "🐙 Docker Compose 版本: $composeVersion" -ForegroundColor Green
                $composeFound = $true
            }
        } catch {}
    }
    
    if (-not $composeFound) {
        Write-Host "⚠️ 未找到 Docker Compose" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ 檢查 Docker Compose 時發生錯誤: $($_.Exception.Message)" -ForegroundColor Red
}

# 總結
Write-Host "`n📊 環境檢查總結" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan

if ($dockerFound) {
    Write-Host "✅ Docker Desktop: 已安裝" -ForegroundColor Green
} else {
    Write-Host "❌ Docker Desktop: 未找到" -ForegroundColor Red
}

if ($dockerExeFound) {
    Write-Host "✅ Docker 命令: 可用" -ForegroundColor Green
} else {
    Write-Host "❌ Docker 命令: 不可用" -ForegroundColor Red
}

if ($kubectlFound) {
    Write-Host "✅ Kubernetes: 可用" -ForegroundColor Green
} else {
    Write-Host "⚠️ Kubernetes: 不可用" -ForegroundColor Yellow
}

if ($composeFound) {
    Write-Host "✅ Docker Compose: 可用" -ForegroundColor Green
} else {
    Write-Host "⚠️ Docker Compose: 不可用" -ForegroundColor Yellow
}

Write-Host "`n🎯 建議操作:" -ForegroundColor Cyan
if (-not $dockerFound) {
    Write-Host "1. 安裝 Docker Desktop" -ForegroundColor Yellow
}
if ($dockerFound -and -not $dockerExeFound) {
    Write-Host "2. 啟動 Docker Desktop 並等待完全啟動" -ForegroundColor Yellow
    Write-Host "3. 重新運行此腳本" -ForegroundColor Yellow
}
if (-not $kubectlFound) {
    Write-Host "4. 在 Docker Desktop 中啟用 Kubernetes" -ForegroundColor Yellow
}

Write-Host "`n✅ 環境檢查完成" -ForegroundColor Green

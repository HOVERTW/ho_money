# WSL2 Configuration Script - Optimize Docker Performance
# Requires Administrator privileges

Write-Host "WSL2 Configuration - Optimize Docker Performance" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check Administrator privileges
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Administrator privileges required" -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator" -ForegroundColor Yellow
    pause
    exit 1
}

# 步驟1: 檢查當前WSL狀態
Write-Host "`n📋 步驟1: 檢查當前WSL狀態..." -ForegroundColor Cyan
try {
    $wslList = wsl --list --verbose 2>$null
    Write-Host "當前WSL狀態:" -ForegroundColor Yellow
    Write-Host $wslList -ForegroundColor Gray
} catch {
    Write-Host "WSL命令不可用" -ForegroundColor Yellow
}

# 步驟2: 安裝Ubuntu (推薦的Linux發行版)
Write-Host "`n📥 步驟2: 安裝Ubuntu..." -ForegroundColor Cyan
Write-Host "正在安裝Ubuntu (這可能需要幾分鐘)..." -ForegroundColor Yellow

try {
    # 安裝Ubuntu
    wsl --install -d Ubuntu
    Write-Host "✅ Ubuntu 安裝命令已執行" -ForegroundColor Green
    
    Write-Host "`n⚠️ 重要提醒:" -ForegroundColor Yellow
    Write-Host "1. Ubuntu 安裝完成後會自動打開" -ForegroundColor Yellow
    Write-Host "2. 請設置Ubuntu用戶名和密碼" -ForegroundColor Yellow
    Write-Host "3. 完成後請重新運行此腳本的後續步驟" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Ubuntu 安裝失敗: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "請手動執行: wsl --install -d Ubuntu" -ForegroundColor Yellow
}

# 步驟3: 等待用戶完成Ubuntu設置
Write-Host "`n⏳ 步驟3: 等待Ubuntu設置完成..." -ForegroundColor Cyan
Write-Host "請完成Ubuntu的初始設置，然後按任意鍵繼續..." -ForegroundColor Yellow
pause

# 步驟4: 驗證WSL2安裝
Write-Host "`n✅ 步驟4: 驗證WSL2安裝..." -ForegroundColor Cyan
try {
    $wslList = wsl --list --verbose
    Write-Host "WSL發行版列表:" -ForegroundColor Green
    Write-Host $wslList -ForegroundColor Gray
    
    # 檢查是否有WSL2發行版
    if ($wslList -match "VERSION\s+2") {
        Write-Host "✅ WSL2 發行版已安裝" -ForegroundColor Green
    } else {
        Write-Host "⚠️ 需要將發行版升級到WSL2" -ForegroundColor Yellow
        
        # 升級到WSL2
        Write-Host "正在升級Ubuntu到WSL2..." -ForegroundColor Yellow
        wsl --set-version Ubuntu 2
        Write-Host "✅ 升級命令已執行" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ WSL2 驗證失敗: $($_.Exception.Message)" -ForegroundColor Red
}

# 步驟5: 設置WSL2為默認版本
Write-Host "`n🔧 步驟5: 設置WSL2為默認版本..." -ForegroundColor Cyan
try {
    wsl --set-default-version 2
    Write-Host "✅ WSL2 已設為默認版本" -ForegroundColor Green
} catch {
    Write-Host "❌ 設置默認版本失敗: $($_.Exception.Message)" -ForegroundColor Red
}

# 步驟6: 配置Docker使用WSL2
Write-Host "`n🐳 步驟6: 配置Docker使用WSL2..." -ForegroundColor Cyan
Write-Host "請手動完成以下步驟:" -ForegroundColor Yellow
Write-Host "1. 打開Docker Desktop" -ForegroundColor Yellow
Write-Host "2. 進入Settings (設置)" -ForegroundColor Yellow
Write-Host "3. 選擇General (一般)" -ForegroundColor Yellow
Write-Host "4. 勾選 'Use the WSL 2 based engine'" -ForegroundColor Yellow
Write-Host "5. 進入Resources > WSL Integration" -ForegroundColor Yellow
Write-Host "6. 啟用Ubuntu集成" -ForegroundColor Yellow
Write-Host "7. 點擊Apply & Restart" -ForegroundColor Yellow

# 步驟7: 創建WSL配置文件
Write-Host "`n📝 步驟7: 創建WSL配置文件..." -ForegroundColor Cyan
$wslConfigPath = "$env:USERPROFILE\.wslconfig"

$wslConfig = @"
[wsl2]
memory=4GB
processors=2
swap=2GB
localhostForwarding=true

[experimental]
autoMemoryReclaim=gradual
networkingMode=mirrored
dnsTunneling=true
firewall=true
autoProxy=true
"@

try {
    $wslConfig | Out-File -FilePath $wslConfigPath -Encoding UTF8
    Write-Host "✅ WSL配置文件已創建: $wslConfigPath" -ForegroundColor Green
    Write-Host "配置內容:" -ForegroundColor Gray
    Write-Host $wslConfig -ForegroundColor Gray
} catch {
    Write-Host "❌ 創建WSL配置文件失敗: $($_.Exception.Message)" -ForegroundColor Red
}

# 步驟8: 重啟WSL
Write-Host "`n🔄 步驟8: 重啟WSL..." -ForegroundColor Cyan
try {
    wsl --shutdown
    Start-Sleep -Seconds 5
    Write-Host "✅ WSL已重啟" -ForegroundColor Green
} catch {
    Write-Host "❌ 重啟WSL失敗: $($_.Exception.Message)" -ForegroundColor Red
}

# 最終驗證
Write-Host "`n📊 最終驗證" -ForegroundColor Cyan
Write-Host "==========" -ForegroundColor Cyan

try {
    $finalWslList = wsl --list --verbose
    Write-Host "最終WSL狀態:" -ForegroundColor Green
    Write-Host $finalWslList -ForegroundColor Gray
    
    if ($finalWslList -match "Ubuntu.*Running.*2") {
        Write-Host "✅ Ubuntu WSL2 運行正常" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Ubuntu WSL2 可能需要手動啟動" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ 最終驗證失敗" -ForegroundColor Red
}

Write-Host "`n🎯 下一步操作:" -ForegroundColor Cyan
Write-Host "1. 重啟Docker Desktop" -ForegroundColor Yellow
Write-Host "2. 確認Docker使用WSL2後端" -ForegroundColor Yellow
Write-Host "3. 測試Docker性能改善" -ForegroundColor Yellow
Write-Host "4. 運行我們的容器化測試" -ForegroundColor Yellow

Write-Host "`n✅ WSL2配置腳本執行完成" -ForegroundColor Green
Write-Host "重啟電腦以確保所有更改生效" -ForegroundColor Yellow

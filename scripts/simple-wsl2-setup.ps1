# Simple WSL2 Setup for Docker
Write-Host "WSL2 Setup for Docker" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan

# Check Administrator privileges
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Administrator privileges required" -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator" -ForegroundColor Yellow
    pause
    exit 1
}

# Step 1: Check current WSL status
Write-Host "`nStep 1: Check current WSL status..." -ForegroundColor Cyan
try {
    $wslList = wsl --list --verbose 2>$null
    Write-Host "Current WSL status:" -ForegroundColor Yellow
    Write-Host $wslList -ForegroundColor Gray
} catch {
    Write-Host "WSL command not available" -ForegroundColor Yellow
}

# Step 2: Install Ubuntu
Write-Host "`nStep 2: Install Ubuntu..." -ForegroundColor Cyan
Write-Host "Installing Ubuntu (this may take several minutes)..." -ForegroundColor Yellow

try {
    wsl --install -d Ubuntu
    Write-Host "Ubuntu installation command executed" -ForegroundColor Green
    
    Write-Host "`nImportant Notes:" -ForegroundColor Yellow
    Write-Host "1. Ubuntu will open automatically after installation" -ForegroundColor Yellow
    Write-Host "2. Please set up Ubuntu username and password" -ForegroundColor Yellow
    Write-Host "3. After setup, run this script again for remaining steps" -ForegroundColor Yellow
    
} catch {
    Write-Host "Ubuntu installation failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please manually run: wsl --install -d Ubuntu" -ForegroundColor Yellow
}

# Step 3: Wait for Ubuntu setup
Write-Host "`nStep 3: Wait for Ubuntu setup..." -ForegroundColor Cyan
Write-Host "Please complete Ubuntu initial setup, then press any key to continue..." -ForegroundColor Yellow
pause

# Step 4: Verify WSL2 installation
Write-Host "`nStep 4: Verify WSL2 installation..." -ForegroundColor Cyan
try {
    $wslList = wsl --list --verbose
    Write-Host "WSL distributions list:" -ForegroundColor Green
    Write-Host $wslList -ForegroundColor Gray
    
    if ($wslList -match "VERSION\s+2") {
        Write-Host "WSL2 distribution installed" -ForegroundColor Green
    } else {
        Write-Host "Need to upgrade distribution to WSL2" -ForegroundColor Yellow
        
        Write-Host "Upgrading Ubuntu to WSL2..." -ForegroundColor Yellow
        wsl --set-version Ubuntu 2
        Write-Host "Upgrade command executed" -ForegroundColor Green
    }
    
} catch {
    Write-Host "WSL2 verification failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 5: Set WSL2 as default version
Write-Host "`nStep 5: Set WSL2 as default version..." -ForegroundColor Cyan
try {
    wsl --set-default-version 2
    Write-Host "WSL2 set as default version" -ForegroundColor Green
} catch {
    Write-Host "Setting default version failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 6: Create WSL configuration file
Write-Host "`nStep 6: Create WSL configuration file..." -ForegroundColor Cyan
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
    Write-Host "WSL configuration file created: $wslConfigPath" -ForegroundColor Green
    Write-Host "Configuration content:" -ForegroundColor Gray
    Write-Host $wslConfig -ForegroundColor Gray
} catch {
    Write-Host "Creating WSL configuration file failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 7: Restart WSL
Write-Host "`nStep 7: Restart WSL..." -ForegroundColor Cyan
try {
    wsl --shutdown
    Start-Sleep -Seconds 5
    Write-Host "WSL restarted" -ForegroundColor Green
} catch {
    Write-Host "WSL restart failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Final verification
Write-Host "`nFinal Verification" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan

try {
    $finalWslList = wsl --list --verbose
    Write-Host "Final WSL status:" -ForegroundColor Green
    Write-Host $finalWslList -ForegroundColor Gray
    
    if ($finalWslList -match "Ubuntu.*Running.*2") {
        Write-Host "Ubuntu WSL2 running normally" -ForegroundColor Green
    } else {
        Write-Host "Ubuntu WSL2 may need manual startup" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Final verification failed" -ForegroundColor Red
}

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Restart Docker Desktop" -ForegroundColor Yellow
Write-Host "2. In Docker Desktop Settings > General, enable 'Use the WSL 2 based engine'" -ForegroundColor Yellow
Write-Host "3. In Docker Desktop Settings > Resources > WSL Integration, enable Ubuntu" -ForegroundColor Yellow
Write-Host "4. Click Apply & Restart" -ForegroundColor Yellow
Write-Host "5. Test Docker performance improvement" -ForegroundColor Yellow

Write-Host "`nWSL2 setup script completed" -ForegroundColor Green
Write-Host "Please restart your computer to ensure all changes take effect" -ForegroundColor Yellow

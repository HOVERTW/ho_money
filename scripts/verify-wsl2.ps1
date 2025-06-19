# WSL2 Verification Script
Write-Host "WSL2 Verification" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan

# Check WSL distributions
Write-Host "`nChecking WSL distributions..." -ForegroundColor Yellow
try {
    $wslList = wsl --list --verbose
    Write-Host $wslList -ForegroundColor Green
    
    if ($wslList -match "Ubuntu.*2") {
        Write-Host "Ubuntu WSL2 is installed" -ForegroundColor Green
    } else {
        Write-Host "Ubuntu WSL2 not found" -ForegroundColor Red
    }
} catch {
    Write-Host "WSL command failed" -ForegroundColor Red
}

# Check Docker context
Write-Host "`nChecking Docker context..." -ForegroundColor Yellow
try {
    $dockerContext = docker context ls
    Write-Host $dockerContext -ForegroundColor Green
    
    if ($dockerContext -match "desktop-linux") {
        Write-Host "Docker is using Linux engine" -ForegroundColor Green
    }
} catch {
    Write-Host "Docker context check failed" -ForegroundColor Red
}

# Check WSL config file
Write-Host "`nChecking WSL config file..." -ForegroundColor Yellow
$configPath = "$env:USERPROFILE\.wslconfig"
if (Test-Path $configPath) {
    Write-Host "WSL config file exists: $configPath" -ForegroundColor Green
    Get-Content $configPath | Write-Host -ForegroundColor Gray
} else {
    Write-Host "WSL config file not found" -ForegroundColor Red
}

Write-Host "`nVerification completed" -ForegroundColor Green

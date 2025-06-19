# Simple Docker Environment Check
Write-Host "Docker Environment Check" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

# Check Docker Desktop installation
$dockerPaths = @(
    "C:\Program Files\Docker\Docker\Docker Desktop.exe",
    "C:\Users\$env:USERNAME\AppData\Local\Docker\Docker Desktop.exe"
)

$dockerFound = $false
foreach ($path in $dockerPaths) {
    if (Test-Path $path) {
        Write-Host "Found Docker Desktop: $path" -ForegroundColor Green
        $dockerFound = $true
        break
    }
}

if (-not $dockerFound) {
    Write-Host "Docker Desktop not found" -ForegroundColor Red
    Write-Host "Please install Docker Desktop" -ForegroundColor Yellow
    exit 1
}

# Check Docker processes
Write-Host "`nChecking Docker processes..." -ForegroundColor Cyan
$dockerProcesses = Get-Process -Name "*docker*" -ErrorAction SilentlyContinue
if ($dockerProcesses) {
    foreach ($process in $dockerProcesses) {
        Write-Host "Docker process: $($process.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "No Docker processes found" -ForegroundColor Yellow
    Write-Host "Starting Docker Desktop..." -ForegroundColor Cyan
    
    # Try to start Docker Desktop
    foreach ($path in $dockerPaths) {
        if (Test-Path $path) {
            Start-Process -FilePath $path -WindowStyle Hidden
            Write-Host "Docker Desktop start command executed" -ForegroundColor Green
            break
        }
    }
    
    Write-Host "Waiting for Docker to start (30 seconds)..." -ForegroundColor Cyan
    Start-Sleep -Seconds 30
}

# Check Docker command
Write-Host "`nChecking Docker command..." -ForegroundColor Cyan
$dockerExePaths = @(
    "C:\Program Files\Docker\Docker\resources\bin\docker.exe",
    "C:\Users\$env:USERNAME\AppData\Local\Docker\resources\bin\docker.exe"
)

$dockerExeFound = $false
foreach ($path in $dockerExePaths) {
    if (Test-Path $path) {
        Write-Host "Found Docker executable: $path" -ForegroundColor Green
        try {
            $version = & $path --version
            Write-Host "Docker version: $version" -ForegroundColor Green
            $dockerExeFound = $true
            
            # Create alias
            Set-Alias -Name docker -Value $path -Scope Global
            Write-Host "Docker alias created" -ForegroundColor Green
            break
        } catch {
            Write-Host "Failed to execute Docker: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

if (-not $dockerExeFound) {
    Write-Host "Docker executable not found or not working" -ForegroundColor Red
}

# Check kubectl
Write-Host "`nChecking kubectl..." -ForegroundColor Cyan
try {
    $kubectlVersion = kubectl version --client --short 2>$null
    if ($kubectlVersion) {
        Write-Host "Kubectl version: $kubectlVersion" -ForegroundColor Green
    } else {
        Write-Host "Kubectl not found or Kubernetes not enabled" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Kubectl not available" -ForegroundColor Yellow
}

# Summary
Write-Host "`nEnvironment Summary" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan

if ($dockerFound) {
    Write-Host "Docker Desktop: Installed" -ForegroundColor Green
} else {
    Write-Host "Docker Desktop: Not found" -ForegroundColor Red
}

if ($dockerExeFound) {
    Write-Host "Docker command: Available" -ForegroundColor Green
} else {
    Write-Host "Docker command: Not available" -ForegroundColor Red
}

Write-Host "`nEnvironment check completed" -ForegroundColor Green

Write-Host "Docker Installation Verification" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

Write-Host "`nChecking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "Docker: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "Docker command not available" -ForegroundColor Red
}

Write-Host "`nChecking Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker compose version
    Write-Host "Docker Compose: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "Docker Compose not available" -ForegroundColor Red
}

Write-Host "`nChecking Kubernetes..." -ForegroundColor Yellow
try {
    $kubectlVersion = kubectl version --client --short
    Write-Host "Kubectl: $kubectlVersion" -ForegroundColor Green
} catch {
    Write-Host "Kubernetes not available" -ForegroundColor Yellow
}

Write-Host "`nVerification completed" -ForegroundColor Green

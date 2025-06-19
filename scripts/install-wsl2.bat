@echo off
echo WSL2 Installation for Docker
echo ============================

echo Checking administrator privileges...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Administrator privileges confirmed
) else (
    echo This script requires administrator privileges
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo.
echo Step 1: Installing Ubuntu...
wsl --install -d Ubuntu

echo.
echo Step 2: Setting WSL2 as default...
wsl --set-default-version 2

echo.
echo Step 3: Creating WSL configuration...
echo [wsl2] > "%USERPROFILE%\.wslconfig"
echo memory=4GB >> "%USERPROFILE%\.wslconfig"
echo processors=2 >> "%USERPROFILE%\.wslconfig"
echo swap=2GB >> "%USERPROFILE%\.wslconfig"
echo localhostForwarding=true >> "%USERPROFILE%\.wslconfig"
echo. >> "%USERPROFILE%\.wslconfig"
echo [experimental] >> "%USERPROFILE%\.wslconfig"
echo autoMemoryReclaim=gradual >> "%USERPROFILE%\.wslconfig"
echo networkingMode=mirrored >> "%USERPROFILE%\.wslconfig"
echo dnsTunneling=true >> "%USERPROFILE%\.wslconfig"
echo firewall=true >> "%USERPROFILE%\.wslconfig"
echo autoProxy=true >> "%USERPROFILE%\.wslconfig"

echo.
echo Step 4: Restarting WSL...
wsl --shutdown

echo.
echo WSL2 installation completed!
echo.
echo Next steps:
echo 1. Ubuntu will open automatically - set up username and password
echo 2. Open Docker Desktop
echo 3. Go to Settings ^> General
echo 4. Enable "Use the WSL 2 based engine"
echo 5. Go to Resources ^> WSL Integration
echo 6. Enable Ubuntu integration
echo 7. Click Apply ^& Restart
echo.
echo Press any key to continue...
pause

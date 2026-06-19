@echo off
cd %~dp0..
echo ============================================
echo Fabric Speaks Dev Manager
echo ============================================
echo.
echo Starting Dev Manager UI on http://localhost:5050
echo.
node tools\dev-manager\server.js
echo.
echo Dev Manager exited. Press any key to close.
pause >nul

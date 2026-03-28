@echo off
setlocal

echo ============================================
echo Fabric Speaks Basic Services Startup
echo ============================================
echo.

echo This script starts only the core services:
echo   1) Auth Service
echo   2) Admin Service
echo   3) API Gateway
echo   4) Frontend (Next.js)
echo.

echo [1/4] Starting Auth Service...
start "Auth Service" cmd /k "cd services/auth-service && npm run dev"

echo.
echo Press any key once Auth Service is ready...
pause >nul

echo [2/4] Starting Admin Service...
start "Admin Service" cmd /k "npm run dev:admin"

echo.
echo Press any key once Admin Service is ready...
pause >nul

echo [3/4] Starting API Gateway...
start "API Gateway" cmd /k "npm run dev:gateway"

echo.
echo Press any key once Gateway is ready...
pause >nul

echo [4/4] Starting Frontend (Next.js)...
start "Frontend (Next.js)" cmd /k "npm run dev:frontend"

echo.
echo ============================================
echo Basic services started!
echo ============================================
echo.
echo URLs:
echo   - Frontend:  http://localhost:3000
echo   - Gateway:   http://localhost:4000
echo   - Admin:     http://localhost:3000/admin
echo.

echo To stop services, close the opened terminal windows.
endlocal

@echo off
cd %~dp0..
echo ============================================
echo Fabric Speaks Local Development Startup
echo ============================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo [1/4] Building shared module...
call npm run setup:shared
if %errorlevel% neq 0 (
    echo ERROR: Failed to build shared module
    pause
    exit /b 1
)
echo.

echo [2/4] Starting backend services (this will run in background)...
start "Admin Service" cmd /k "npm run dev:admin"
start "Auth Service" cmd /k "cd services/auth-service && npm run dev"
start "Catalog Service" cmd /k "cd services/catalog-service && npm run dev"

echo Waiting 10 seconds for services to initialize...
timeout /t 10 /nobreak >nul

echo.
echo [3/4] Starting local gateway...
start "API Gateway" cmd /k "npm run dev:gateway"

echo Waiting 5 seconds for gateway to start...
timeout /t 5 /nobreak >nul

echo.
echo [4/4] Starting frontend...
start "Frontend (Next.js)" cmd /k "npm run dev:frontend"

echo.
echo ============================================
echo All services started!
echo ============================================
echo.
echo Services:
echo   - Frontend:     http://localhost:3000
echo   - API Gateway: http://localhost:4000
echo   - Admin:       http://localhost:3000/admin
echo.
echo To stop all services, run: npm run stop
echo.
pause

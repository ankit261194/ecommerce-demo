@echo off
REM ==============================================================================
REM AuraMarket Multi-Vendor Platform — 1-Click Windows Docker Deployment
REM ==============================================================================

echo 🚀 Starting AuraMarket Multi-Vendor Platform Deployment...

where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: Docker is not installed or not in PATH. Please start Docker Desktop.
    pause
    exit /b 1
)

echo 📦 Building and starting multi-container orchestration...
docker compose up -d --build

echo ⏳ Waiting for containers to initialize...
timeout /t 10 /nobreak >nul

echo.
echo ================================================================================
echo ✨ AuraMarket Platform Successfully Deployed!
echo ================================================================================
echo 🌐 Customer Storefront ^& Panels: http://localhost:80
echo ⚙️ Backend API ^& Webhooks:       http://localhost:5000/api
echo 🏥 System Health Status:         http://localhost:5000/api/health
echo 📊 Database:                     mongodb://localhost:27017
echo ⚡ Redis In-Memory Cache:        redis://localhost:6379
echo ================================================================================
echo To view live logs: docker compose logs -f
echo To stop platform:  docker compose down
echo ================================================================================
pause

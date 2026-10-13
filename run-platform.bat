@echo off
title AuraMarket Multi-Vendor Launcher
echo ===================================================
echo   AuraMarket Multi-Vendor E-Commerce Platform
echo   Obsidian Slate & Electric Amber Luxury Theme
echo ===================================================
echo.

echo [1/3] Starting Backend API Gateway on port 5000...
start "AuraMarket Backend" cmd /k "cd backend && npm start"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Frontend Web Panels on port 3000...
start "AuraMarket Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 4 /nobreak >nul

echo [3/3] Launching Web Browser...
start http://localhost:3000

echo.
echo ===================================================
echo   Platform is running!
echo   Frontend : http://localhost:3000
echo   Backend  : http://localhost:5000/api/health
echo ===================================================
pause

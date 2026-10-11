@echo off
REM ==============================================================================
REM AERO-SENSE // Automated Vercel Deployment Script for Windows
REM Smart India Hackathon (SIH 2026) Project
REM ==============================================================================

echo.
echo ========================================================
echo   AERO-SENSE : AI Weather Sensor Anomaly Detection
echo   Initiating Automated Vercel Deployment
echo ========================================================
echo.

REM 1. Verify Node.js and NPM
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in PATH. Please install Node.js from https://nodejs.org/
    exit /b 1
)

echo [1/3] Installing workspace dependencies...
call npm.cmd install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Root dependency install failed.
    exit /b 1
)

echo [2/3] Building production frontend with Vite...
call npm.cmd --prefix frontend run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Frontend Vite build failed.
    exit /b 1
)

echo.
echo [3/3] Deploying to Vercel...
echo If this is your first time, Vercel will prompt you to log in.
echo Follow the terminal prompts to select your project or create a new one.
echo.

call npx.cmd vercel --prod

echo.
echo ========================================================
echo   Deployment process completed successfully!
echo   Access your live dashboard at the Vercel URL printed above.
echo ========================================================
echo.
pause

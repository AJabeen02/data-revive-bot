@echo off
title SIH Multi-Hazard Intelligence Dashboard
echo =========================================================
echo    SIH 2024 Geo-Climate Multi-Hazard Intelligence Dashboard
echo =========================================================
echo Starting local prototype server...
echo.

cd /d "%~dp0"

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found in your PATH. Please install Python 3.9+.
    pause
    exit /b 1
)

echo Opening browser at http://localhost:8000 ...
start "" http://localhost:8000

REM Run Flask app
python app.py
if %errorlevel% neq 0 (
    echo [INFO] Flask server stopped or encountered an issue. Falling back to http.server...
    cd web
    python -m http.server 8000
)

pause

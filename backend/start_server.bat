@echo off
echo ========================================
echo   Spottr Backend Server Startup
echo ========================================
echo.

cd /d "%~dp0"

echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH!
    echo Please install Python 3.9 or higher.
    pause
    exit /b 1
)

echo.
echo Checking virtual environment...
if not exist "venv\Scripts\activate.bat" (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment!
        pause
        exit /b 1
    )
    echo Virtual environment created successfully!
)

echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Checking dependencies...
pip show fastapi >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies... This may take a few minutes.
    echo.
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
    echo Dependencies installed successfully!
)

echo.
echo Checking model file...
if not exist "..\models\weights\best.pt" (
    echo WARNING: Model file not found at ..\models\weights\best.pt
    echo Please ensure the model file exists before continuing.
    echo.
    pause
)

echo.
echo ========================================
echo   Starting Detection Server
echo ========================================
echo.
echo Server will start on http://0.0.0.0:8000
echo Press Ctrl+C to stop the server
echo.
echo Your IP addresses:
ipconfig | findstr /i "IPv4"
echo.
echo Update my-app/services/detection-config.ts with your IP address
echo.
echo ========================================
echo.

python main.py

pause

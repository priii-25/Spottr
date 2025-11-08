@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   Spottr Backend Server Startup
echo ========================================
echo.

REM Check Python
echo Checking Python installation...
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher from python.org
    pause
    exit /b 1
)

REM Check virtual environment
echo.
echo Checking virtual environment...
if not exist "venv" (
    echo ERROR: Virtual environment not found
    echo Please run: python -m venv venv
    pause
    exit /b 1
)

REM Activate virtual environment
echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Check dependencies
echo.
echo Checking dependencies...
pip show fastapi >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing dependencies...
    pip install -r requirements.txt
)

REM Check model file
echo.
echo Checking model file...
if not exist "..\models\weights\best.pt" (
    echo WARNING: Model file not found at ..\models\weights\best.pt
    echo Detection may not work correctly
)

REM Display startup info
echo.
echo ========================================
echo   Starting Detection Server
echo ========================================
echo.
echo Server will start on http://0.0.0.0:8000
echo Press Ctrl+C to stop the server
echo.
echo Your IP addresses:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do echo    IPv4 Address. . . . . . . . . . . :%%a
echo.
echo Update my-app/services/detection-config.ts with your IP address
echo.
echo ========================================
echo.

REM Start server with UTF-8 encoding
python main.py

pause

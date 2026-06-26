@echo off
echo ============================================
echo HealthLink AI Service - Startup Script
echo ============================================
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    echo Virtual environment created.
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies if needed
echo Checking dependencies...
pip install -r requirements.txt -q

echo.
echo ============================================
echo Starting AI Service on port 8097...
echo ============================================
echo.

REM Start the server
python main.py

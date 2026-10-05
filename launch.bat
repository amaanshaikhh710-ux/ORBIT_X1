@echo off
setlocal
echo ======================================================================
echo   ORBITAL TWIN -- Spacecraft Digital Twin Launch Sequence
echo ======================================================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.12+ from python.org.
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js 18+ from nodejs.org.
    pause
    exit /b 1
)

echo [*] Starting FastAPI Backend on http://localhost:8000 ...
start "Orbital Twin Backend" cmd /k "python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload"

echo [*] Starting Vite Frontend on http://localhost:5173 ...
start "Orbital Twin Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ======================================================================
echo   SUCCESS: Orbital Twin is booting!
echo   - Backend API: http://localhost:8000
echo   - API Docs:    http://localhost:8000/docs
echo   - Frontend UI: http://localhost:5173
echo ======================================================================
echo.

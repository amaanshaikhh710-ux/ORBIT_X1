# Orbital Twin -- Spacecraft Digital Twin PowerShell Launcher
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  ORBITAL TWIN -- Spacecraft Digital Twin Launch Sequence" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# Verify prerequisites
$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) {
    Write-Host "[ERROR] Python is not installed or not found on PATH." -ForegroundColor Red
    Write-Host "Please install Python 3.12+ from python.org." -ForegroundColor Yellow
    Exit 1
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "[ERROR] Node.js is not installed or not found on PATH." -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from nodejs.org." -ForegroundColor Yellow
    Exit 1
}

Write-Host "[*] Launching FastAPI Backend on http://localhost:8000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload"

Write-Host "[*] Launching Vite Frontend on http://localhost:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm run dev"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  Orbital Twin Platform Live:" -ForegroundColor Green
Write-Host "  - UI Workbench: http://localhost:5173" -ForegroundColor White
Write-Host "  - Backend API:  http://localhost:8000" -ForegroundColor White
Write-Host "  - API Swagger:  http://localhost:8000/docs" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan

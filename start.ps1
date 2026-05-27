## TOEFL Prep Studio — 一键启动脚本
## 用法: 右键此文件 → 使用 PowerShell 运行
##       或在终端输入: powershell -File start.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$python = "C:\Users\LNGION\miniconda3\python.exe"

Write-Host ""
Write-Host "  TOEFL Prep Studio" -ForegroundColor Cyan
Write-Host "  =================" -ForegroundColor DarkCyan
Write-Host ""

# Check Python
if (-not (Test-Path $python)) {
    $python = "python"
}

# Check .env
$envFile = Join-Path $backend ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "  [!] .env not found, copying from .env.example" -ForegroundColor Yellow
    Copy-Item (Join-Path $backend ".env.example") $envFile
    Write-Host "  [!] Please edit $envFile and add your DEEPSEEK_API_KEY" -ForegroundColor Yellow
}

# Seed database if toefl.db doesn't exist
$dbFile = Join-Path $backend "toefl.db"
if (-not (Test-Path $dbFile)) {
    Write-Host "  [*] Initializing database with seed data..." -ForegroundColor Green
    Push-Location $backend
    & $python seed_db.py
    Pop-Location
    Write-Host ""
}

# Start backend
Write-Host "  [*] Starting backend on http://localhost:8000 ..." -ForegroundColor Green
$backendJob = Start-Process -FilePath $python -ArgumentList "-m", "uvicorn", "main:app", "--reload", "--port", "8000" -WorkingDirectory $backend -PassThru -WindowStyle Normal

Start-Sleep -Seconds 2

# Start frontend (npm is a .ps1 script, so launch via cmd)
Write-Host "  [*] Starting frontend on http://localhost:5173 ..." -ForegroundColor Green
$frontendJob = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev" -WorkingDirectory $frontend -PassThru -WindowStyle Normal

Start-Sleep -Seconds 3

# Open browser
Write-Host ""
Write-Host "  [OK] Both servers started!" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:  http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "  Press Enter to stop both servers..." -ForegroundColor DarkGray

Start-Process "cmd.exe" -ArgumentList "/c", "start http://localhost:5173"

Read-Host

# Cleanup
Write-Host "  [*] Stopping servers..." -ForegroundColor Yellow
try { Stop-Process -Id $backendJob.Id -Force -ErrorAction SilentlyContinue } catch {}
try { Stop-Process -Id $frontendJob.Id -Force -ErrorAction SilentlyContinue } catch {}
Write-Host "  [OK] Done." -ForegroundColor Green

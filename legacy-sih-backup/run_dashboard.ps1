# PowerShell script to run the SIH Multi-Hazard Dashboard
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   SIH Geo-Climate Multi-Hazard Intelligence Dashboard   " -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Cyan

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path $scriptPath

Start-Process "http://localhost:8000"
Write-Host "Starting Flask server on http://localhost:8000..." -ForegroundColor Green
python app.py

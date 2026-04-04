#!/usr/bin/env pwsh
Write-Host "Starting frontend build..." -ForegroundColor Green
Set-Location -Path "d:\MES_PROJET\gestion_biens\gestion_patrimoine\Patrimoine-\frontend"
npm run build
Write-Host "Build complete." -ForegroundColor Green

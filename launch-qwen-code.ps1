# ========================================
# Qwen Code Launcher with Tiktoken Fix
# ========================================
# This script fixes the "Missing tiktoken_bg.wasm" error and launches Qwen Code
# Can be run infinitely - it will clean and reinstall dependencies each time

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Qwen Code Setup & Launch Script   " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Navigate to QwenCode directory
Write-Host "[1/8] Navigating to QwenCode directory..." -ForegroundColor Yellow
Set-Location "C:\Projects\QwenCode"
if (-not (Test-Path "C:\Projects\QwenCode")) {
    Write-Host "ERROR: QwenCode directory not found at C:\Projects\QwenCode" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Directory found" -ForegroundColor Green
Write-Host ""

# Step 2: Activate Python virtual environment (if exists)
Write-Host "[2/8] Checking for Python virtual environment..." -ForegroundColor Yellow
if (Test-Path ".venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & .\.venv\Scripts\Activate.ps1
    Write-Host "✓ Virtual environment activated" -ForegroundColor Green
} else {
    Write-Host "⚠ No virtual environment found (this may be okay)" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Remove existing tiktoken package
Write-Host "[3/8] Removing existing tiktoken package..." -ForegroundColor Yellow
if (Test-Path "node_modules\tiktoken") {
    Remove-Item -Recurse -Force "node_modules\tiktoken" -ErrorAction SilentlyContinue
    Write-Host "✓ Removed existing tiktoken" -ForegroundColor Green
} else {
    Write-Host "⚠ tiktoken not found in node_modules" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Clean npm cache
Write-Host "[4/8] Cleaning npm cache..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "✓ npm cache cleaned" -ForegroundColor Green
Write-Host ""

# Step 5: Reinstall tiktoken from source
Write-Host "[5/8] Installing tiktoken from source (this may take a minute)..." -ForegroundColor Yellow
npm install tiktoken --build-from-source
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ tiktoken install had issues, trying alternative method..." -ForegroundColor Yellow
    npm install tiktoken --force
}
Write-Host "✓ tiktoken installed" -ForegroundColor Green
Write-Host ""

# Step 6: Install/update all dependencies
Write-Host "[6/8] Installing all dependencies..." -ForegroundColor Yellow
npm install
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 7: Clear npx cache
Write-Host "[7/8] Clearing npx cache..." -ForegroundColor Yellow
$npxCachePath = "$env:LOCALAPPDATA\npm-cache\_npx"
if (Test-Path $npxCachePath) {
    Remove-Item -Recurse -Force $npxCachePath -ErrorAction SilentlyContinue
    Write-Host "✓ npx cache cleared" -ForegroundColor Green
} else {
    Write-Host "⚠ npx cache not found (this is okay)" -ForegroundColor Yellow
}
Write-Host ""

# Step 8: Navigate to app folder and launch Qwen Code
Write-Host "[8/8] Launching Qwen Code..." -ForegroundColor Yellow
Set-Location "C:\Users\ben_l\automerchant-local"
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Starting Qwen Code Interactive     " -ForegroundColor Cyan
Write-Host "  Version: 0.6.0 (Local Build)       " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Launch LOCAL Qwen Code (not npx version!)
node "C:\Projects\QwenCode\dist\cli.js"

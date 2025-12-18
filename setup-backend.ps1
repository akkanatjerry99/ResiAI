# ResiFlow Backend Setup Script
# This script helps set up the backend environment

Write-Host "🏥 ResiFlow Backend Setup" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js v18 or higher." -ForegroundColor Red
    exit 1
}

# Check if MongoDB is running
Write-Host "Checking MongoDB..." -ForegroundColor Yellow
try {
    $mongoProcess = Get-Process mongod -ErrorAction SilentlyContinue
    if ($mongoProcess) {
        Write-Host "✓ MongoDB is running" -ForegroundColor Green
    } else {
        Write-Host "⚠ MongoDB is not running. Starting MongoDB..." -ForegroundColor Yellow
        try {
            net start MongoDB
            Write-Host "✓ MongoDB started" -ForegroundColor Green
        } catch {
            Write-Host "⚠ Could not start MongoDB. You may need to:" -ForegroundColor Yellow
            Write-Host "  - Install MongoDB from https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
            Write-Host "  - Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "⚠ MongoDB check failed. Make sure MongoDB is installed." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✓ .env file exists" -ForegroundColor Green
} else {
    Write-Host "⚠ Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ .env file created. Please edit it with your configuration." -ForegroundColor Green
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Backend setup complete! 🎉" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Edit backend/.env file and add:" -ForegroundColor White
Write-Host "   - GEMINI_API_KEY (get from https://ai.google.dev)" -ForegroundColor White
Write-Host "   - MONGODB_URI (if using MongoDB Atlas)" -ForegroundColor White
Write-Host "   - JWT_SECRET (change the default)" -ForegroundColor White
Write-Host ""
Write-Host "2. Start the backend server:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. In a new terminal, set up the frontend:" -ForegroundColor White
Write-Host "   npm install" -ForegroundColor Cyan
Write-Host "   # Edit .env.local and add GEMINI_API_KEY" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""

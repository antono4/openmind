# OPEN MIND AI - Windows Installer
#
# Run this in PowerShell as Administrator
# PowerShell -ExecutionPolicy Bypass -File install-windows.ps1

param(
    [switch]$InstallOllama,
    [switch]$CreateDesktopShortcut
)

$ErrorActionPreference = "Stop"

# Configuration
$AppName = "OpenMind AI"
$AppDir = "$env:LOCALAPPDATA\OpenMindAI"
$BinDir = "$env:LOCALAPPDATA\OpenMindAI\bin"
$RepoUrl = "https://github.com/Antono4/openmind.git"

# Colors for output
function Write-Status { param($Message) Write-Host "[OK] $Message" -ForegroundColor Green }
function Write-ErrorMsg { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                       ║" -ForegroundColor Cyan
Write-Host "║   OPEN MIND AI - Windows Installer                    ║" -ForegroundColor Cyan
Write-Host "║                                                       ║" -ForegroundColor Cyan
Write-Host "║   AI Without Token Limitations                        ║" -ForegroundColor Yellow
Write-Host "║                                                       ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Info "Checking prerequisites..."

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Status "Node.js: $nodeVersion"
} catch {
    Write-ErrorMsg "Node.js not found. Please install from https://nodejs.org"
    exit 1
}

# Check pnpm
try {
    $pnpmVersion = pnpm --version
    Write-Status "pnpm: $pnpmVersion"
} catch {
    Write-Info "Installing pnpm..."
    npm install -g pnpm
    Write-Status "pnpm installed"
}

# Check Git
try {
    $gitVersion = git --version
    Write-Status "Git: $gitVersion"
} catch {
    Write-ErrorMsg "Git not found. Please install from https://git-scm.com"
    exit 1
}

Write-Host ""

# Install Ollama if requested
if ($InstallOllama) {
    Write-Info "Installing Ollama..."
    winget install Ollama.Ollama --accept-source-agreements --accept-package-agreements 2>$null -or (
        # Fallback to direct download if winget fails
        $ollamaUrl = "https://github.com/ollama/ollama/releases/latest/download/ollama-windows-amd64.exe"
        Invoke-WebRequest -Uri $ollamaUrl -OutFile "$env:TEMP\ollama.exe"
        Move-Item "$env:TEMP\ollama.exe" "$env:LOCALAPPDATA\Programs\ollama.exe" -Force
    )
    Write-Status "Ollama installed"
}

# Create directories
Write-Info "Creating directories..."
New-Item -ItemType Directory -Force -Path $AppDir | Out-Null
New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
Write-Status "Directories created"

# Clone or update repository
if (Test-Path "$AppDir\.git") {
    Write-Info "Updating existing installation..."
    Set-Location $AppDir
    git pull origin main
} else {
    Write-Info "Cloning repository..."
    git clone $RepoUrl $AppDir
    Set-Location $AppDir
}

# Install dependencies
Write-Info "Installing Node.js dependencies..."
pnpm install
Write-Status "Dependencies installed"

# Build CLI
Write-Info "Building CLI..."
pnpm --filter @openmind/cli build
Copy-Item -Recurse -Path "apps\cli\dist\*" -Destination $BinDir -Force
Write-Status "CLI built"

# Build API Server
Write-Info "Building API server..."
pnpm --filter @openmind/api-server build
Write-Status "API server built"

# Add to PATH
Write-Info "Adding to PATH..."
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$BinDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$BinDir", "User")
    $env:Path = "$UserPath;$BinDir"
}
Write-Status "PATH updated"

# Create desktop shortcut if requested
if ($CreateDesktopShortcut) {
    Write-Info "Creating desktop shortcut..."
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\OpenMind AI.lnk")
    $Shortcut.TargetPath = "$BinDir\openmind.exe"
    $Shortcut.Arguments = "info"
    $Shortcut.Description = "Open-source AI without token limitations"
    $Shortcut.Save()
    Write-Status "Desktop shortcut created"
}

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                       ║" -ForegroundColor Green
Write-Host "║   Installation Complete!                              ║" -ForegroundColor Yellow
Write-Host "║                                                       ║" -ForegroundColor Green
Write-Host "║   Next steps:                                         ║" -ForegroundColor Green
Write-Host "║                                                       ║" -ForegroundColor Green
Write-Host "║   1. Restart your terminal                            ║" -ForegroundColor White
Write-Host "║                                                       ║" -ForegroundColor Green
Write-Host "║   2. Run: openmind --help                             ║" -ForegroundColor White
Write-Host "║                                                       ║" -ForegroundColor Green
Write-Host "║   3. For AI features, install Ollama:                 ║" -ForegroundColor White
Write-Host "║      ollama pull llama3                               ║" -ForegroundColor White
Write-Host "║                                                       ║" -ForegroundColor Green
Write-Host "║   Location: $AppDir                  ║" -ForegroundColor White
Write-Host "║                                                       ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
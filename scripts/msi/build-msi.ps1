#!/usr/bin/env pwsh
#
# OPEN MIND AI - MSI Installer Builder
#
# This script builds an MSI installer for Windows.
# Requires WiX Toolset or can use Tauri bundler.
#
# Usage:
#   .\build-msi.ps1           # Build with Tauri (requires Rust)
#   .\build-msi.ps1 -Standalone  # Build standalone MSI with WiX
#

param(
    [switch]$Standalone,
    [switch]$UseWiX,
    [string]$OutputDir = ".\dist\installers"
)

$ErrorActionPreference = "Stop"

# Configuration
$ProductName = "OPEN MIND AI"
$Version = "1.0.0"
$Manufacturer = "OPEN MIND Team"
$UpgradeCode = "E8B3F5A2-7D4C-4B1E-9F6A-3C8D2E1B5F4A"
$InstallDir = "$env:LOCALAPPDATA\$ProductName"

# Colors
function Write-Step { param($Message) Write-Host "[BUILD] $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "[OK] $Message" -ForegroundColor Green }
function Write-ErrorMsg { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Yellow }

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   OPEN MIND AI - MSI Installer Builder                ║" -ForegroundColor Cyan
Write-Host "║   Version: $Version                                  ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Step "Checking prerequisites..."

$HasRust = $false
$HasWiX = $false
$HasNode = $false

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Success "Node.js: $nodeVersion"
    $HasNode = $true
} catch {
    Write-ErrorMsg "Node.js not found. Please install from https://nodejs.org"
    exit 1
}

# Check Rust
try {
    $rustVersion = rustc --version
    Write-Success "Rust: $rustVersion"
    $HasRust = $true
} catch {
    Write-Info "Rust not found. Standalone MSI will be used."
}

# Check WiX (optional)
try {
    $wixVersion = heat --version 2>$null
    if ($wixVersion) {
        Write-Success "WiX: $wixVersion"
        $HasWiX = $true
    }
} catch {
    Write-Info "WiX Toolset not found. Install from: https://wixtoolset.org/"
}

# Create output directory
Write-Step "Creating output directory..."
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
Write-Success "Output: $OutputDir"

# Build application
if ($HasRust) {
    Write-Step "Building Tauri application..."
    
    Set-Location "$PSScriptRoot\..\..\apps\desktop"
    
    # Build with Tauri
    pnpm tauri build --bundles msi
    
    # Copy MSI to output
    $MsiPath = Get-ChildItem -Path "src-tauri\target\release\bundle\msi" -Filter "*.msi" | Select-Object -First 1
    if ($MsiPath) {
        Copy-Item $MsiPath.FullName -Destination "$OutputDir\$ProductName-$Version.msi" -Force
        Write-Success "MSI created: $OutputDir\$ProductName-$Version.msi"
    }
    
} elseif ($Standalone -and $HasWiX) {
    # Build standalone MSI with WiX
    Write-Step "Building standalone MSI with WiX..."
    
    # Build CLI first
    Set-Location "$PSScriptRoot\..\.."
    pnpm --filter @openmind/cli build
    pnpm --filter @openmind/api-server build
    
    # Create MSI structure
    $TempDir = "$env:TEMP\openmind-msi-temp"
    $StagingDir = "$TempDir\staging"
    
    New-Item -ItemType Directory -Force -Path $StagingDir | Out-Null
    New-Item -ItemType Directory -Force -Path "$StagingDir\CLI" | Out-Null
    New-Item -ItemType Directory -Force -Path "$StagingDir\API" | Out-Null
    
    # Copy files
    Write-Step "Copying application files..."
    Copy-Item "apps\cli\dist\*" -Destination "$StagingDir\CLI\" -Recurse -Force
    Copy-Item "apps\api-server\dist\*" -Destination "$StagingDir\API\" -Recurse -Force
    
    # Create WiX source file
    $WixSource = "$TempDir\product.wxs"
    
    @"
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product Id="*" Name="$ProductName" Language="1033" Version="$Version" Manufacturer="$Manufacturer" UpgradeCode="$UpgradeCode">
    <Package InstallerVersion="200" Compressed="yes" Description="Open-source AI without token limitations" />
    <MajorUpgrade DowngradeErrorMessage="A newer version is already installed." />
    
    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="ProgramFilesFolder">
        <Directory Id="INSTALLFOLDER" Name="$ProductName">
          <Directory Id="CLIFolder" Name="CLI">
            <Component Id="CLIFiles" Guid="*">
              $(Get-ChildItem "$StagingDir\CLI" -Recurse -File | ForEach-Object { 
                "<File Id='$($_.BaseName)' Source='$($_.FullName)' />"
              })
            </Component>
          </Directory>
          <Directory Id="APIFolder" Name="API">
            <Component Id="APIFiles" Guid="*">
              $(Get-ChildItem "$StagingDir\API" -Recurse -File | ForEach-Object { 
                "<File Id='$($_.BaseName)' Source='$($_.FullName)' />"
              })
            </Component>
          </Directory>
        </Directory>
      </Directory>
      <Directory Id="ProgramMenuFolder">
        <Directory Id="ApplicationProgramsFolder" Name="$ProductName">
          <Component Id="StartMenu" Guid="*">
            <Shortcut Id="ApplicationStartMenuShortcut" Name="$ProductName" Target="[INSTALLFOLDER]\CLI\openmind.exe" />
            <RemoveFolder Id="RemoveApplicationProgramsFolder" On="uninstall" />
          </Component>
        </Directory>
      </Directory>
      <Directory Id="DesktopFolder">
        <Component Id="DesktopShortcut" Guid="*">
          <Shortcut Id="DesktopShortcut" Name="$ProductName" Target="[INSTALLFOLDER]\CLI\openmind.exe" />
        </Component>
      </Directory>
    </Directory>
    
    <Feature Id="ProductFeature" Title="$ProductName" Level="1">
      <ComponentRef Id="CLIFiles" />
      <ComponentRef Id="APIFiles" />
      <ComponentRef Id="StartMenu" />
      <ComponentRef Id="DesktopShortcut" />
    </Feature>
    
    <Property Id="WIXUI_INSTALLDIR" Value="INSTALLFOLDER" />
  </Product>
</Wix>
"@ | Out-File -FilePath $WixSource -Encoding UTF8
    
    # Build MSI
    Write-Step "Building MSI..."
    Push-Location $TempDir
    candle.exe -out product.wixobj product.wxs
    light.exe -out "$OutputDir\$ProductName-$Version.msi" product.wixobj
    Pop-Location
    
    # Cleanup
    Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    
    Write-Success "MSI created: $OutputDir\$ProductName-$Version.msi"
    
} else {
    # Build CLI only (no Rust/WiX)
    Write-Step "Building CLI application..."
    
    Set-Location "$PSScriptRoot\..\.."
    pnpm --filter @openmind/cli build
    pnpm --filter @openmind/api-server build
    
    # Create portable ZIP as fallback
    Write-Step "Creating portable distribution..."
    
    $PortableDir = "$OutputDir\$ProductName-$Version-portable"
    New-Item -ItemType Directory -Force -Path $PortableDir | Out-Null
    
    Copy-Item "apps\cli\dist\*" -Destination "$PortableDir\" -Recurse -Force
    Copy-Item "apps\api-server\dist\*" -Destination "$PortableDir\" -Recurse -Force
    
    # Copy install script
    Copy-Item "scripts\install\install-windows.ps1" -Destination "$PortableDir\" -Force
    
    # Create README
    @"
OPEN MIND AI - Portable Version
===============================

Version: $Version
Location: $PortableDir

Usage:
  CLI:    openmind.exe --help
  API:    node api-server\dist\index.js

For full installation, run install-windows.ps1 or install from:
https://github.com/Antono4/openmind/releases
"@ | Out-File -FilePath "$PortableDir\README.txt" -Encoding UTF8
    
    # Create ZIP
    Compress-Archive -Path "$PortableDir\*" -DestinationPath "$OutputDir\$ProductName-$Version-portable.zip" -Force
    Remove-Item $PortableDir -Recurse -Force
    
    Write-Success "Portable ZIP created: $OutputDir\$ProductName-$Version-portable.zip"
}

# Summary
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   Build Complete!                                      ║" -ForegroundColor Green
Write-Host "║                                                       ║" -ForegroundColor Green
Write-Host "║   Output: $OutputDir         ║" -ForegroundColor White
Write-Host "║                                                       ║" -ForegroundColor Green
Write-Host "║   Files:" -ForegroundColor Green
Get-ChildItem $OutputDir | ForEach-Object {
    Write-Host "║     - $($_.Name)" -ForegroundColor White
}
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
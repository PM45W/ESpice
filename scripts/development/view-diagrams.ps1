# ESpice Diagram Viewer Script
# This script helps you quickly open and view the architecture diagrams

Write-Host "🎯 ESpice Platform - Diagram Viewer" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if VS Code is installed
function Test-VSCode {
    try {
        $null = Get-Command code -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

# Function to open file in VS Code
function Open-InVSCode {
    param([string]$FilePath)
    if (Test-VSCode) {
        Write-Host "Opening in VS Code..." -ForegroundColor Green
        code $FilePath
    } else {
        Write-Host "VS Code not found. Please install VS Code first." -ForegroundColor Red
        Write-Host "Download from: https://code.visualstudio.com/" -ForegroundColor Yellow
    }
}

# Function to open file in browser
function Open-InBrowser {
    param([string]$FilePath)
    Write-Host "Opening in browser..." -ForegroundColor Green
    Start-Process $FilePath
}

# Function to open file in default application
function Open-File {
    param([string]$FilePath)
    if (Test-Path $FilePath) {
        Write-Host "Opening file..." -ForegroundColor Green
        Start-Process $FilePath
    } else {
        Write-Host "File not found: $FilePath" -ForegroundColor Red
    }
}

# Main menu
function Show-Menu {
    Write-Host "📊 Available Diagram Files:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. 📋 Main Architecture Diagrams (Markdown)" -ForegroundColor White
    Write-Host "2. 🎯 Presentation Version (Markdown)" -ForegroundColor White
    Write-Host "3. 🌐 Interactive HTML Version (Browser)" -ForegroundColor White
    Write-Host "4. 📖 VS Code Viewing Guide" -ForegroundColor White
    Write-Host "5. 🔧 Open All in VS Code" -ForegroundColor White
    Write-Host "6. 🚀 Quick Start - Open Main Diagrams" -ForegroundColor Green
    Write-Host "0. ❌ Exit" -ForegroundColor Red
    Write-Host ""
}

# File paths
$mainDiagrams = "docs/architecture/ESpice_Architecture_Diagram.md"
$presentation = "docs/architecture/ESpice_Presentation.md"
$htmlDiagrams = "docs/architecture/ESpice_Diagrams.html"
$viewingGuide = "docs/architecture/VSCODE_DIAGRAM_VIEWING_GUIDE.md"

# Main loop
do {
    Show-Menu
    $choice = Read-Host "Enter your choice (0-6)"
    
    switch ($choice) {
        "1" {
            Write-Host ""
            Write-Host "📋 Opening Main Architecture Diagrams..." -ForegroundColor Cyan
            Write-Host "File: $mainDiagrams" -ForegroundColor Gray
            Write-Host "Tip: Press Ctrl+Shift+V to view diagrams in VS Code" -ForegroundColor Yellow
            Write-Host ""
            Open-InVSCode $mainDiagrams
        }
        "2" {
            Write-Host ""
            Write-Host "🎯 Opening Presentation Version..." -ForegroundColor Cyan
            Write-Host "File: $presentation" -ForegroundColor Gray
            Write-Host "Tip: Press Ctrl+Shift+V to view diagrams in VS Code" -ForegroundColor Yellow
            Write-Host ""
            Open-InVSCode $presentation
        }
        "3" {
            Write-Host ""
            Write-Host "🌐 Opening Interactive HTML Version..." -ForegroundColor Cyan
            Write-Host "File: $htmlDiagrams" -ForegroundColor Gray
            Write-Host "This will open in your default browser" -ForegroundColor Yellow
            Write-Host ""
            Open-InBrowser $htmlDiagrams
        }
        "4" {
            Write-Host ""
            Write-Host "📖 Opening VS Code Viewing Guide..." -ForegroundColor Cyan
            Write-Host "File: $viewingGuide" -ForegroundColor Gray
            Write-Host "This guide explains how to view diagrams in VS Code" -ForegroundColor Yellow
            Write-Host ""
            Open-InVSCode $viewingGuide
        }
        "5" {
            Write-Host ""
            Write-Host "🔧 Opening All Diagram Files in VS Code..." -ForegroundColor Cyan
            Write-Host "This will open all diagram files in separate tabs" -ForegroundColor Yellow
            Write-Host ""
            Open-InVSCode $mainDiagrams
            Start-Sleep -Seconds 1
            Open-InVSCode $presentation
            Start-Sleep -Seconds 1
            Open-InVSCode $viewingGuide
            Write-Host "All files opened! Switch between tabs to view different diagrams." -ForegroundColor Green
        }
        "6" {
            Write-Host ""
            Write-Host "🚀 Quick Start - Opening Main Diagrams..." -ForegroundColor Green
            Write-Host "Opening the main architecture diagrams file..." -ForegroundColor Cyan
            Write-Host ""
            Write-Host "📋 Next Steps:" -ForegroundColor Yellow
            Write-Host "1. Wait for VS Code to open" -ForegroundColor White
            Write-Host "2. Press Ctrl+Shift+V to open preview" -ForegroundColor White
            Write-Host "3. Or install 'Mermaid Preview' extension for better viewing" -ForegroundColor White
            Write-Host ""
            Open-InVSCode $mainDiagrams
            Write-Host "✅ File opened! Now press Ctrl+Shift+V to view diagrams." -ForegroundColor Green
            break
        }
        "0" {
            Write-Host ""
            Write-Host "👋 Goodbye! Happy diagram viewing!" -ForegroundColor Green
            break
        }
        default {
            Write-Host ""
            Write-Host "❌ Invalid choice. Please enter a number between 0-6." -ForegroundColor Red
            Write-Host ""
        }
    }
    
    if ($choice -ne "0" -and $choice -ne "6") {
        Write-Host ""
        $continue = Read-Host "Press Enter to continue or 'q' to quit"
        if ($continue -eq "q") {
            Write-Host "👋 Goodbye!" -ForegroundColor Green
            break
        }
    }
    
} while ($choice -ne "0" -and $choice -ne "6")

Write-Host ""
Write-Host "💡 Pro Tips:" -ForegroundColor Yellow
Write-Host "- Install 'Mermaid Preview' extension for the best viewing experience" -ForegroundColor White
Write-Host "- Use Ctrl+Shift+V to open markdown preview" -ForegroundColor White
Write-Host "- The HTML version works great for presentations" -ForegroundColor White
Write-Host "- All diagrams are also viewable on GitHub/GitLab" -ForegroundColor White
Write-Host "" 
@echo off
echo 🧪 ElavonX Extension Quick Test
echo ================================

echo.
echo 📋 Testing Extension Installation...
code --list-extensions | findstr elavonx
if %errorlevel% equ 0 (
    echo ✅ Extension is installed in VS Code
) else (
    echo ❌ Extension not found in VS Code
)

echo.
echo 📋 Testing Extension Installation in Cursor...
cursor --list-extensions | findstr elavonx
if %errorlevel% equ 0 (
    echo ✅ Extension is installed in Cursor
) else (
    echo ❌ Extension not found in Cursor
)

echo.
echo 🚀 Opening test files...
start code test-all-panels.js
timeout /t 2 /nobreak > nul
start cursor test-all-panels.js

echo.
echo 📋 Test files opened in both editors
echo.
echo 🔍 Manual Testing Steps:
echo 1. Check if ElavonX icon appears in Activity Bar
echo 2. Press Ctrl+Shift+P and type "ElavonX"
echo 3. Try "ElavonX: Test Extension" command
echo 4. Try "ElavonX: Scan Project for Converge Endpoints" command
echo 5. Check all panels in the ElavonX sidebar
echo.
echo 📖 See MANUAL_TEST_GUIDE.md for detailed testing instructions
echo.
pause

@echo off
echo 🧪 ElavonX Panel Testing - Complete Panel Test
echo ================================================

echo.
echo 📋 Extension Status Check...
code --list-extensions | findstr elavonx
if %errorlevel% equ 0 (
    echo ✅ Extension installed in VS Code
) else (
    echo ❌ Extension not found in VS Code
)

cursor --list-extensions | findstr elavonx
if %errorlevel% equ 0 (
    echo ✅ Extension installed in Cursor
) else (
    echo ❌ Extension not found in Cursor
)

echo.
echo 🚀 Opening test files for panel testing...
start code test-panels.js
timeout /t 2 /nobreak > nul
start cursor test-panels.js

echo.
echo 📋 Panel Testing Instructions:
echo ==============================
echo.
echo 1. PANEL VISIBILITY TEST:
echo    - Look for ElavonX icon in Activity Bar (left sidebar)
echo    - Click the icon to expand panels
echo    - Verify all 5 panels are visible:
echo      📊 Scan Panel
echo      🔐 Credentials Panel  
echo      📚 Documentation Panel
echo      🔄 Migration Panel
echo      📈 Report Panel
echo.
echo 2. PANEL FUNCTIONALITY TEST:
echo    - Press Ctrl+Shift+P
echo    - Type "ElavonX" to see all commands
echo    - Test each panel individually:
echo      - "ElavonX: Test Scan Panel"
echo      - "ElavonX: Test Credentials Panel"
echo      - "ElavonX: Test Documentation Panel"
echo      - "ElavonX: Test Migration Panel"
echo      - "ElavonX: Test Report Panel"
echo      - "ElavonX: Test All Panels"
echo.
echo 3. PANEL INTERACTION TEST:
echo    - Click on each panel to verify it opens
echo    - Check if panels are responsive
echo    - Look for any error messages
echo    - Verify data is displayed correctly
echo.
echo 4. SCAN PANEL SPECIFIC TEST:
echo    - Click "Start Scan" button in Scan Panel
echo    - Wait for scan to complete
echo    - Verify endpoints are detected in test-panels.js
echo    - Check if results are displayed properly
echo.
echo 📖 Detailed testing guide: PANEL_TEST_GUIDE.md
echo.
echo 🎯 Success Criteria:
echo    - All 5 panels are visible
echo    - All panels are responsive
echo    - All test commands work
echo    - Scan detects patterns correctly
echo    - No error messages appear
echo.
pause

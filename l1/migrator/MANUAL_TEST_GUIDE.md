# 🧪 ElavonX Extension Manual Testing Guide

## **Prerequisites**
- VS Code or Cursor with ElavonX extension installed
- Test files: `test-all-panels.js` and `test-extension.js`

## **Test 1: Extension Activation**

### **Steps:**
1. Open VS Code/Cursor
2. Open `test-all-panels.js`
3. Open Developer Tools (`Ctrl+Shift+I` or `Cmd+Option+I`)
4. Go to Console tab
5. Look for these messages:
   - 🚀 Converge-Elavon Migrator extension is now active!
   - ✅ Commands registered directly
   - ✅ ElavonX extension activated successfully

### **Expected Result:**
- Extension should activate automatically when opening a JavaScript file
- Console should show activation messages
- No error messages should appear

---

## **Test 2: Command Palette Commands**

### **Steps:**
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type `ElavonX` to see all available commands
3. Test each command:

#### **2.1 Test Extension Command**
- Type: `ElavonX: Test Extension`
- Press Enter
- **Expected:** "ElavonX extension is working!" message

#### **2.2 Scan Project Command**
- Type: `ElavonX: Scan Project for Converge Endpoints`
- Press Enter
- **Expected:** "Scan Project command executed! (Direct registration)" message

#### **2.3 Other Commands**
- Type: `ElavonX: Open Credentials Manager`
- Type: `ElavonX: Show Documentation`
- Type: `ElavonX: Start Migration`
- Type: `ElavonX: Generate Report`

### **Expected Result:**
- All commands should be available in the command palette
- Commands should execute without errors
- Appropriate messages should be displayed

---

## **Test 3: Activity Bar Panels**

### **Steps:**
1. Look for the ElavonX icon in the Activity Bar (left sidebar)
2. Click on the ElavonX icon
3. Verify all panels are visible:

#### **3.1 Scan Panel**
- Should show "Project Scan" section
- Should have "Start Scan" button
- Should display scan results when executed

#### **3.2 Credentials Panel**
- Should show "Credentials Manager" section
- Should have fields for:
  - Merchant ID
  - API Key
  - Environment (Sandbox/Production)
- Should have "Save", "Test", "Clear" buttons

#### **3.3 Documentation Panel**
- Should show "Documentation Viewer" section
- Should display Converge and Elavon API documentation
- Should have search functionality

#### **3.4 Migration Panel**
- Should show "Migration Suggestions" section
- Should display migration options
- Should have "Start Migration" button

#### **3.5 Report Panel**
- Should show "Migration Report" section
- Should have "Generate Report" button
- Should display migration statistics

### **Expected Result:**
- All panels should be visible and functional
- No error messages should appear
- UI should be responsive and well-formatted

---

## **Test 4: Workspace Scanning**

### **Steps:**
1. Open `test-all-panels.js` (contains various Converge patterns)
2. Run the scan command: `ElavonX: Scan Project for Converge Endpoints`
3. Check the Scan Panel for results
4. Verify detected endpoints:

#### **4.1 Expected Endpoints:**
- ProcessTransactionOnline endpoint
- Hosted Payments endpoint
- Checkout.js integration
- Batch processing endpoint
- Device management endpoint
- SSL fields variations

#### **4.2 Expected Results:**
- Should detect multiple Converge endpoints
- Should show file paths and line numbers
- Should display code snippets
- Should categorize by endpoint type

### **Expected Result:**
- Scan should complete successfully
- Multiple endpoints should be detected
- Results should be displayed in the Scan Panel

---

## **Test 5: Pattern Detection**

### **Steps:**
1. Open `test-all-panels.js`
2. Look for highlighted Converge patterns
3. Check if CodeLens suggestions appear above Converge code
4. Right-click on Converge code to see context menu options

### **Expected Result:**
- Converge patterns should be highlighted
- CodeLens suggestions should appear
- Context menu should show migration options

---

## **Test 6: Error Handling**

### **Steps:**
1. Try to run commands without proper setup
2. Check for appropriate error messages
3. Verify graceful degradation

### **Expected Result:**
- Error messages should be informative
- Extension should not crash
- Graceful error handling should be present

---

## **Test 7: Performance**

### **Steps:**
1. Open large files with many Converge patterns
2. Run multiple scans
3. Check for performance issues

### **Expected Result:**
- Extension should remain responsive
- Scans should complete in reasonable time
- No memory leaks or performance degradation

---

## **Troubleshooting**

### **If Extension Doesn't Activate:**
1. Check Developer Console for errors
2. Restart VS Code/Cursor
3. Reinstall extension
4. Check extension logs

### **If Commands Don't Work:**
1. Verify extension is activated
2. Check command palette for typos
3. Look for error messages in console
4. Try reloading window

### **If Panels Don't Show:**
1. Check Activity Bar for ElavonX icon
2. Click on the icon to expand panels
3. Check if panels are collapsed
4. Verify extension activation

### **If Scanning Fails:**
1. Check file permissions
2. Verify file types are supported
3. Look for error messages
4. Try with smaller files first

---

## **Success Criteria**

✅ **Extension activates automatically**  
✅ **All commands are available and functional**  
✅ **All panels are visible and responsive**  
✅ **Workspace scanning detects Converge patterns**  
✅ **Pattern detection works correctly**  
✅ **Error handling is graceful**  
✅ **Performance is acceptable**  

---

## **Reporting Issues**

If any test fails:
1. Note the specific test that failed
2. Capture error messages
3. Include steps to reproduce
4. Provide system information (OS, VS Code version, etc.)

---

**Happy Testing! 🎉**

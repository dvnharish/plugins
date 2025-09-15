# DevGuard Manual Installation

## Quick Install (Recommended)

### Method 1: Development Mode
1. Open VS Code in the DevGuard directory
2. Press `F5` to launch Extension Development Host
3. Open `demo-project` folder in the new window
4. Look for 🛡️ shield icon in Activity Bar

### Method 2: Copy Extension Files
1. Build the extension: `pnpm build`
2. Copy `packages/extension` to VS Code extensions folder:
   - **Windows**: `%USERPROFILE%\.vscode\extensions\devguard-1.0.0`
   - **macOS**: `~/.vscode/extensions/devguard-1.0.0`
   - **Linux**: `~/.vscode/extensions/devguard-1.0.0`
3. Restart VS Code
4. Look for DevGuard in Activity Bar

### Method 3: Symlink (Advanced)
```bash
# Create symlink to extensions folder
ln -s "$(pwd)/packages/extension" ~/.vscode/extensions/devguard-1.0.0
```

## Verification
- Look for 🛡️ shield icon in Activity Bar
- Check Extensions view for "DevGuard"
- Open Command Palette → type "DevGuard"
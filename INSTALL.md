# Installation Guide

This guide walks you through installing and setting up the Claude Code Menu Bar app.

## For End Users (Using Pre-built Release)

### Step 1: Download and Install the App

1. Download the latest release from the [Releases page](https://github.com/PiXeL16/claudecode-macmenu/releases)
2. Download the `.dmg` file for macOS
3. Open the `.dmg` file
4. Drag the "Claude Code Menu" app to your Applications folder
5. Open the app from Applications

**First Launch:**
- macOS may show a security warning since the app isn't signed
- Go to System Preferences → Security & Privacy
- Click "Open Anyway" to allow the app to run

### Step 2: Install Claude Code Hooks

The app needs hooks configured in Claude Code to send real-time notifications.

**Option A: Automatic Installation (Recommended)**

1. Click the menu bar icon
2. Select "Install Hooks..." from the menu
3. Follow the prompts

**Option B: Manual Installation**

1. Open Terminal
2. Run the installation script:
   ```bash
   curl -sSL https://raw.githubusercontent.com/PiXeL16/claudecode-macmenu/main/hooks/install-hooks.sh | bash
   ```

   Or if you cloned the repository:
   ```bash
   cd /path/to/claudecode-macmenu
   ./hooks/install-hooks.sh
   ```

### Step 3: Verify Installation

1. The menu bar icon should appear in your menu bar
2. Click the icon - you should see:
   - "Server: localhost:3456" (or another port)
   - Your Claude Code usage statistics
3. Click "Test Notification" to verify notifications work

### Step 4: Configure Auto-start (Optional)

To have the app start automatically when you log in:

**macOS:**
1. Go to System Preferences → Users & Groups → Login Items
2. Click the "+" button
3. Navigate to Applications and select "Claude Code Menu"
4. Make sure the checkbox is checked

**Or use the app:**
1. Click the menu bar icon
2. Select "Start at Login" to toggle auto-start

## For Developers (Building from Source)

### Prerequisites

- macOS 10.13 or later
- Node.js 18 or later
- npm

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/PiXeL16/claudecode-macmenu.git
cd claudecode-macmenu

# Install dependencies
npm install
```

### Step 2: Build the Application

```bash
# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Or package for distribution
npm run package
```

The packaged app will be in the `dist` folder.

### Step 3: Install Hooks

```bash
# Run the installation script
./hooks/install-hooks.sh
```

### Step 4: Start the App

```bash
# Development mode (with console output)
npm run dev

# Or run the packaged app
open dist/mac/Claude\ Code\ Menu.app
```

## Post-Installation Configuration

### Customizing Notifications

1. Click the menu bar icon
2. Toggle "Enabled" to turn notifications on/off
3. Toggle "Sound" to enable/disable notification sounds

### Customizing Which Events Trigger Notifications

Edit `~/.config/claude-code/hooks.json` to customize:

- Add more tools to monitor (Edit, Write, Read, etc.)
- Remove events you don't want
- Change notification behavior

See [HOOKS.md](./HOOKS.md) for detailed customization options.

## Troubleshooting Installation

### App Won't Open

**Security Warning:**
- macOS may block unsigned apps
- Go to System Preferences → Security & Privacy → Click "Open Anyway"

**Port Conflict:**
- If port 3456 is in use, the app will automatically use the next available port
- Check the menu to see which port is being used

### Hooks Not Working

**Check hooks are installed:**
```bash
cat ~/.config/claude-code/hooks.json
```

You should see hook configurations for Stop, SubagentStop, and PostToolUse events.

**Check the server is running:**
```bash
curl -X POST http://localhost:3456/hook \
  -H 'Content-Type: application/json' \
  -d '{"event":"Stop","timestamp":"2025-01-15T10:30:00Z"}'
```

If this shows a notification, the server works but hooks need configuration.

**Restore previous hooks:**
If the installation backed up your hooks:
```bash
cp ~/.config/claude-code/hooks.json.backup ~/.config/claude-code/hooks.json
```

### No Statistics Showing

The app reads usage data from `~/.claude/projects/**/*.jsonl`

**Check if files exist:**
```bash
ls -la ~/.claude/projects/
```

If no files exist, use Claude Code for a bit to generate usage data.

### Notifications Not Appearing

**Check macOS notification settings:**
1. System Preferences → Notifications
2. Find "Claude Code Menu" in the list
3. Ensure notifications are enabled and set to "Alerts" (not "Banners")

**Check app notification settings:**
1. Click the menu bar icon
2. Ensure "Enabled" is checked

## Uninstallation

### Remove the App

1. Quit the app from the menu bar (click icon → Quit)
2. Delete from Applications folder
3. Remove from Login Items if added

### Remove Hooks (Optional)

If you want to remove the hooks:

```bash
# Restore backup if you have one
cp ~/.config/claude-code/hooks.json.backup ~/.config/claude-code/hooks.json

# Or manually edit
nano ~/.config/claude-code/hooks.json
```

### Remove Settings (Optional)

```bash
rm -rf ~/Library/Application\ Support/claudecode-macmenu
```

## Getting Help

- **Issues:** [GitHub Issues](https://github.com/PiXeL16/claudecode-macmenu/issues)
- **Documentation:** [HOOKS.md](./HOOKS.md) for hook system details
- **README:** [README.md](./README.md) for feature overview

# Claude Code Mac Menu

A macOS menu bar application that enhances Claude Code with comprehensive usage analytics and sound notifications.

## Features

- 📊 **Detailed Analytics**: Real-time token usage, cost tracking, and burn rate analysis
  - Token consumption (input, output, cache tokens)
  - Cost tracking with model-specific pricing
  - Burn rate (tokens/min, $/hour)
  - Session tracking (5-hour blocks)
  - Model usage breakdown
- 🔔 **Hook-Based Notifications**: Real-time notifications using Claude Code hooks
  - Notifies when Claude finishes responding (Stop event)
  - Notifies when task agents complete (SubagentStop event)
  - Notifies when specific tools complete (Bash, Task, etc.)
  - Event-driven, no polling required
- 💰 **Cost Monitoring**: Track daily and total spending
- 📈 **Live Stats**: Auto-updates every 30 seconds
- 🎛️ **Settings**: Customize notification sounds and preferences
- 🍎 **Native macOS**: Lives in your menu bar for easy access

## Analytics Tracked

**Messages**
- Today's message count
- Total messages
- New message detection for notifications

**Tokens**
- Daily and total token consumption
- Current session tokens
- Input/output/cache token breakdown
- Per-model token usage

**Costs**
- Daily costs
- Total costs
- Current session costs
- Real-time burn rate

**Sessions**
- 5-hour session blocks
- Daily and total session counts
- Active session monitoring

## Installation

### Via Homebrew (Recommended)

```bash
brew install --cask claudecode-macmenu
```

### Manual Download

1. Download the latest `.dmg` from [Releases](https://github.com/PiXeL16/claudecode-macmenu/releases)
2. Open the DMG and drag the app to Applications
3. Launch from Applications or Spotlight

## Development

```bash
# Install dependencies
make install

# Run in development mode
make dev

# Build TypeScript
make build

# Package for distribution
make package

# Run tests
make test
```

## Release Process

### For Maintainers

**Quick releases:**
```bash
# Patch release (0.1.0 → 0.1.1)
make release-patch

# Minor release (0.1.0 → 0.2.0)
make release-minor
```

**Manual version:**
```bash
# Specify exact version
make release VERSION=1.0.0
```

**What happens during release:**
1. ✅ Updates version in `package.json`
2. ✅ Builds the application
3. ✅ Packages DMG and ZIP files
4. ✅ Creates git commit and tag
5. ✅ Pushes to GitHub
6. ✅ GitHub Actions creates release with artifacts
7. ✅ Update Homebrew cask manually or via PR

**GitHub Actions:**
- Automatically builds and creates releases when version tags are pushed
- Uploads DMG and ZIP to GitHub Releases
- Generates release notes automatically

**Homebrew:**
After GitHub release is published:
```bash
# Update Homebrew cask (requires homebrew-cask tap)
brew bump-cask-pr claudecode-macmenu --version=0.2.0
```

## Requirements

- macOS 10.13 or later
- Node.js 18 or later

## Quick Start

### For End Users

1. **Download** the latest release `.dmg` file
2. **Install** the app by dragging it to Applications
3. **Launch** the app - look for the icon in your menu bar
4. **Setup hooks** - The app will prompt you to install Claude Code hooks automatically
   - Click "Install Hooks" when prompted
   - Or go to Setup → Install Hooks from the menu

That's it! You'll now get real-time notifications when Claude Code completes tasks.

📖 **Detailed installation guide:** [INSTALL.md](./INSTALL.md)

### For Developers

```bash
# Clone and install
git clone https://github.com/PiXeL16/claudecode-macmenu.git
cd claudecode-macmenu
npm install

# Build and run
npm run build
npm run dev

# The app will prompt you to install hooks automatically
```

## Usage

### Menu Features

Click the menu bar icon to access:

**Statistics:**
- 💬 Messages (today and total)
- 🎯 Tokens (input, output, cache)
- 💰 Costs (daily and total)
- 🔥 Burn Rate (tokens/min, $/hour)
- 📅 Sessions (5-hour blocks)
- 📊 Model Breakdown

**Notifications:**
- Toggle notifications on/off
- Toggle sound alerts
- View hook server status
- Test notifications

**Setup:**
- Install/update hooks
- Open hooks configuration
- Restore hooks backup
- Configure auto-start at login

## How It Works

**Notifications (Hook-Based):**
- The app runs an HTTP server on `localhost:3456`
- Claude Code hooks send events to the server when tasks complete
- You get instant notifications without any polling or file watching
- See [HOOKS.md](./HOOKS.md) for customization

**Analytics (File-Based):**
- Reads Claude Code usage data from `~/.claude/projects/**/*.jsonl`
- Tracks tokens, costs, sessions, and model usage
- Auto-updates every 30 seconds
- Based on [Claude-Code-Usage-Monitor](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor)

**Data Storage:**
- Settings: `~/Library/Application Support/claudecode-macmenu/settings.json`
- Hooks config: `~/.config/claude-code/hooks.json`
- Usage data: `~/.claude/projects/**/*.jsonl` (read-only)

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

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build TypeScript
npm run build

# Package for distribution
npm run package
```

## Requirements

- macOS 10.13 or later
- Node.js 18 or later

## Setup

### 1. Install Hook Configuration

To enable real-time notifications, you need to configure Claude Code hooks:

```bash
# Run the installation script
./hooks/install-hooks.sh
```

This will install hook configurations that send events to the menu bar app when:
- Claude finishes responding
- Task agents complete
- Bash or Task tools complete

For more details, see [HOOKS.md](./HOOKS.md)

### 2. Start the App

The app runs in your menu bar and:
- Listens for hook events on `http://localhost:3456`
- Reads usage analytics from `~/.claude/projects/**/*.jsonl`

## Usage

Click the menu bar icon to:
- View detailed usage statistics (tokens, costs, sessions)
- See burn rate and current session metrics
- Explore per-model token usage breakdown
- Check hook server status
- Toggle notifications and sounds
- Refresh statistics manually
- Test notifications

## Data Sources

The app reads Claude Code usage data from JSONL files:
- **Location**: `~/.claude/projects/**/*.jsonl`
- **Format**: JSON Lines (one JSON object per line)
- **Data**: Timestamp, tokens, costs, model info
- **Monitoring**: Watches for file changes in real-time

Analytics approach based on [Claude-Code-Usage-Monitor](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor) by Maciek-roboblog.

## Configuration

Settings and data are stored in:
- `~/Library/Application Support/claudecode-macmenu/settings.json` - User preferences
- Source data: `~/.claude/projects/**/*.jsonl` - Claude Code usage logs (read-only)

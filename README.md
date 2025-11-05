# Claude Code Mac Menu

A macOS menu bar application that enhances Claude Code with comprehensive usage analytics and sound notifications.

## Features

- 📊 **Detailed Analytics**: Real-time token usage, cost tracking, and burn rate analysis
  - Token consumption (input, output, cache tokens)
  - Cost tracking with model-specific pricing
  - Burn rate (tokens/min, $/hour)
  - Session tracking (5-hour blocks)
  - Model usage breakdown
- 🔔 **Smart Notifications**: Get notified when Claude Code completes new messages
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

## Usage

The app runs in your menu bar and monitors Claude Code activity by reading usage data from:
- `~/.claude/projects/**/*.jsonl`

Click the menu bar icon to:
- View detailed usage statistics (tokens, costs, sessions)
- See burn rate and current session metrics
- Explore per-model token usage breakdown
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

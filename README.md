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

## Requirements

- macOS 10.13 or later
- Node.js 18 or later

## Installation & Setup

### 1. Install the App

```bash
# Install dependencies
npm install

# Build the app
npm run build

# Run the app
npm start
```

### 2. Install Claude Code Hooks (Required for Notifications)

To receive notifications when Claude Code finishes working:

```bash
cd hooks
./install-hooks.sh
```

This sets up hooks in `~/.claude/settings.json` that notify the app when:
- Claude Code finishes responding (Stop event)
- Sessions start and end

See [hooks/README.md](hooks/README.md) for detailed setup instructions.

## Usage

The app integrates with Claude Code in two ways:

**1. Real-time Notifications (via Hooks)**
- Install hooks using `hooks/install-hooks.sh`
- Get notified instantly when Claude Code finishes working
- Hooks trigger on Stop, SessionStart, and SessionEnd events

**2. Analytics Dashboard (via JSONL files)**
- Reads usage data from `~/.claude/projects/**/*.jsonl`
- Shows detailed statistics in the menu bar

Click the menu bar icon to:
- View detailed usage statistics (tokens, costs, sessions)
- See burn rate and current session metrics
- Explore per-model token usage breakdown
- Toggle notifications and sounds
- Refresh statistics manually
- Test notifications

## How It Works

### Notifications (Hook-Based)
- **Setup**: Install hooks via `hooks/install-hooks.sh`
- **Events**: Claude Code triggers hooks on Stop, SessionStart, SessionEnd
- **IPC**: Hooks send messages to app via Unix socket (`/tmp/claudecode-macmenu.sock`)
- **Result**: Instant notification when Claude finishes working

### Analytics (JSONL-Based)
- **Source**: `~/.claude/projects/**/*.jsonl` files
- **Format**: JSON Lines (one JSON object per line)
- **Data**: Timestamp, tokens, costs, model info
- **Update**: Auto-refreshes every 60 seconds
- **Approach**: Based on [Claude-Code-Usage-Monitor](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor)

## Configuration

**App Settings:**
- `~/Library/Application Support/claudecode-macmenu/settings.json` - User preferences

**Claude Code Integration:**
- `~/.claude/settings.json` - Hook configuration (installed via `hooks/install-hooks.sh`)
- `~/.claude/projects/**/*.jsonl` - Usage data (read-only)

**IPC:**
- `/tmp/claudecode-macmenu.sock` - Unix socket for hook communication

## Development

```bash
# Run in development mode
npm run dev

# Watch mode (auto-rebuild)
npm run watch

# Package for distribution
npm run package
```

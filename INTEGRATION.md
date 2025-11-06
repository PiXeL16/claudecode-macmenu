# Claude Code Integration Guide

This document explains how the menu bar app integrates with Claude Code using two complementary approaches:

1. **Hook-based Notifications** - Real-time event notifications
2. **JSONL Analytics** - Comprehensive usage data analysis

## Integration Architecture

```
Claude Code
    ├─> Hooks (Stop, SessionStart, SessionEnd)
    │     └─> hook script (claude-hook.js)
    │           └─> Unix Socket (/tmp/claudecode-macmenu.sock)
    │                 └─> Menu Bar App (Notifications)
    │
    └─> JSONL Files (~/.claude/projects/**/*.jsonl)
          └─> UsageReader Service
                └─> Analytics Service
                      └─> Menu Bar App (Statistics)
```

## 1. Hook-Based Notifications

### Overview

Claude Code's hook system allows us to execute scripts when events occur. We use this for **instant notifications** when Claude finishes working.

### Hook Events Used

- **Stop**: Triggered when Claude finishes responding (main use case for notifications)
- **SessionStart**: When a Claude Code session starts
- **SessionEnd**: When a Claude Code session ends

### Implementation

**Hook Script** (`hooks/claude-hook.js`)
- Node.js script called by Claude Code hooks
- Receives event data on stdin
- Sends message to menu bar app via Unix socket
- Fails silently if app isn't running

**IPC Server** (`src/services/hookServer.ts`)
- Creates Unix socket at `/tmp/claudecode-macmenu.sock`
- Listens for hook messages
- Triggers notifications when receiving Stop events
- Refreshes analytics on session events

**Installation**
```bash
cd hooks
./install-hooks.sh
```

This adds hook configuration to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/hooks/claude-hook.js"
          }
        ]
      }
    ]
  }
}
```

### Hook Message Format

```json
{
  "event": "Stop",
  "sessionId": "session_abc123",
  "timestamp": "2025-11-06T10:30:45.123Z",
  "data": {
    "hook_event_name": "Stop",
    "session_id": "session_abc123",
    "transcript_path": "/path/to/transcript.jsonl",
    "cwd": "/project/path"
  }
}
```

### Benefits

- ✅ **Instant notifications** - No polling, immediate response
- ✅ **Reliable** - Triggered directly by Claude Code
- ✅ **Efficient** - No file watching overhead for notifications
- ✅ **Event-aware** - Knows exactly when tasks complete

## 2. JSONL Analytics

### Overview

Claude Code writes usage data to JSONL files. We read these for **comprehensive analytics**.

### Data Format

Each JSONL file contains one JSON object per line:

```json
{
  "timestamp": "2025-11-06T10:30:45.123Z",
  "message_id": "msg_abc123",
  "request_id": "req_xyz789",
  "model": "claude-3-5-sonnet-20250219",
  "input_tokens": 1250,
  "output_tokens": 850,
  "cache_creation_tokens": 200,
  "cache_read_tokens": 450,
  "cost_usd": 0.0234
}
```

### Implementation

**UsageReader Service** (`src/services/usageReader.ts`)
- Recursively scans `~/.claude/projects/` for `.jsonl` files
- Parses JSONL format (one JSON object per line)
- Deduplicates entries based on message_id/request_id
- Filters entries by date (last 8 days by default)
- Optional: Watches for file changes

**Analytics Service** (`src/services/analytics.ts`)
- Processes usage entries to calculate statistics
- Tracks tokens (input, output, cache creation, cache read)
- Calculates costs using model-specific pricing
- Computes burn rate (tokens/min, $/hour)
- Groups into 5-hour session blocks
- Maintains per-model breakdown
- Refreshes every 60 seconds

### Model Pricing

The app includes pricing for Claude models (per million tokens):

**Claude 3 Opus**
- Input: $15.00, Output: $75.00
- Cache Creation: $18.75, Cache Read: $1.50

**Claude 3.5 Sonnet**
- Input: $3.00, Output: $15.00
- Cache Creation: $3.75, Cache Read: $0.30

**Claude 3 Haiku**
- Input: $0.25, Output: $1.25
- Cache Creation: $0.30, Cache Read: $0.03

### Session Blocks

Sessions are grouped into 5-hour blocks:
- Each 5-hour period = 1 session
- Helps identify distinct work periods
- Today's sessions = unique 5-hour blocks today
- Total sessions = all unique blocks in the last 8 days

### Benefits

- ✅ **Comprehensive data** - Full history and detailed metrics
- ✅ **Cost tracking** - Accurate pricing calculations
- ✅ **No dependencies** - Works independently of hooks
- ✅ **Historical analysis** - Last 8 days of data

## Why Two Approaches?

| Aspect | Hooks | JSONL Files |
|--------|-------|-------------|
| **Purpose** | Real-time notifications | Analytics & statistics |
| **Speed** | Instant | Delayed (60s refresh) |
| **Data** | Event metadata | Full usage details |
| **Setup** | Requires installation | Automatic |
| **Dependency** | Needs hooks installed | Always available |

**Together they provide:**
- ⚡ Instant notifications when Claude finishes
- 📊 Comprehensive analytics and cost tracking
- 🔄 Automatic fallback if hooks aren't installed
- 📈 Both real-time awareness and historical insights

## Setup Instructions

### Basic Setup (Analytics Only)

Just run the app - analytics work automatically:

```bash
npm install
npm run build
npm start
```

### Full Setup (Notifications + Analytics)

Install hooks for instant notifications:

```bash
# Install the app
npm install
npm run build

# Install hooks
cd hooks
./install-hooks.sh

# Run the app
cd ..
npm start
```

## Testing

### Test Hooks

1. Install hooks: `cd hooks && ./install-hooks.sh`
2. Start the menu bar app
3. Check console: Should see "Hook server started successfully"
4. Use Claude Code
5. When Claude finishes: Should see notification + sound

### Test Analytics

1. Start the menu bar app
2. Click menu bar icon
3. Should see statistics if you've used Claude Code
4. Use Claude Code
5. Wait 60 seconds or click "Refresh Stats"
6. Stats should update

## Troubleshooting

**No notifications:**
- Check if hooks are installed: `cat ~/.claude/settings.json`
- Verify hook script exists: `ls hooks/claude-hook.js`
- Check app logs: Should see "Hook server started"
- Ensure Node.js is available for hook script

**No analytics:**
- Check if JSONL files exist: `ls ~/.claude/projects/**/*.jsonl`
- Verify you've used Claude Code recently
- Try "Refresh Stats" from menu
- Check console for errors

**Hook errors:**
- Test hook manually: `echo '{"hook_event_name":"Stop"}' | node hooks/claude-hook.js`
- Check socket exists: `ls /tmp/claudecode-macmenu.sock`
- Review Claude Code console for hook errors

## Credits

**JSONL Analytics Approach:**
Based on [Claude-Code-Usage-Monitor](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor) by Maciek-roboblog.

**Hook Integration:**
Uses Claude Code's official hooks system as documented in the [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks).

## Privacy & Security

- ✅ All data is read-only from local files
- ✅ No data is sent to external servers
- ✅ Statistics are cached locally
- ✅ Only reads user-owned files in `~/.claude/`
- ✅ No modification of Claude Code data
- ✅ Hooks run locally on your machine
- ✅ IPC socket is local (no network exposure)

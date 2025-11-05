# Claude Code Integration Guide

This document explains how the menu bar app integrates with Claude Code.

## Overview

The menu bar app monitors Claude Code usage by reading usage data from JSONL files that Claude Code automatically creates. This is the **implemented approach**.

## Implementation: JSONL File Monitoring

The app reads usage data from `~/.claude/projects/**/*.jsonl` files.

### Data Format

Each JSONL file contains one JSON object per line:

```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
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

**1. UsageReader Service** (`src/services/usageReader.ts`)
- Recursively scans `~/.claude/projects/` for `.jsonl` files
- Parses JSONL format (one JSON object per line)
- Deduplicates entries based on message_id/request_id
- Filters entries by date (last 8 days by default)
- Watches for file changes in real-time

**2. Analytics Service** (`src/services/analytics.ts`)
- Processes usage entries to calculate statistics
- Tracks tokens (input, output, cache creation, cache read)
- Calculates costs using model-specific pricing
- Computes burn rate (tokens/min, $/hour)
- Groups into 5-hour session blocks
- Maintains per-model breakdown

**3. Main App** (`src/main.ts`)
- Sets up file watching on startup
- Detects new messages for notifications
- Refreshes menu every 30 seconds
- Updates stats when files change

### Notification Trigger

The app detects new messages by comparing message counts:
1. Tracks `messagesCount` from last refresh
2. When stats refresh (every 60s or on file change), compares counts
3. If count increased, triggers notification with the number of new messages

This approach is simple and reliable - any new Claude Code activity results in new JSONL entries, which triggers notifications.

## Model Pricing

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

Pricing is automatically applied based on the model name in the usage data.

## Session Blocks

Sessions are grouped into 5-hour blocks, following the same approach as Claude-Code-Usage-Monitor:
- Each 5-hour period = 1 session
- Helps identify distinct work periods
- Today's sessions = unique 5-hour blocks today
- Total sessions = all unique blocks in the last 8 days

## Credits

This integration approach is based on [Claude-Code-Usage-Monitor](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor) by Maciek-roboblog, which pioneered the JSONL file reading approach for tracking Claude Code usage.

## Testing

To test the integration:

1. **Use Claude Code**: Send some messages in Claude Code
2. **Check files**: Verify JSONL files exist at `~/.claude/projects/`
3. **Launch app**: Run the menu bar app
4. **View stats**: Click the menu icon to see your usage statistics
5. **Test notifications**: Enable notifications and send a new message

## Troubleshooting

**No data showing:**
- Check if `~/.claude/projects/` exists
- Verify JSONL files contain data
- Try "Refresh Stats" from the menu

**Notifications not working:**
- Ensure notifications are enabled in the menu
- Check macOS notification permissions
- Use "Test Notification" to verify sound settings

**Incorrect costs:**
- Verify model names in JSONL files
- Check if pricing in `src/types/usage.ts` is up to date

## Privacy & Security

- All data is read-only from local files
- No data is sent to external servers
- Statistics are cached locally
- Only reads user-owned files in `~/.claude/`
- No modification of Claude Code data

# Claude Code Hooks for Menu Bar Notifications

This guide explains how the hook-based notification system works and how to customize it.

## Overview

The menu bar app uses Claude Code's hook system to receive real-time notifications about events happening in your Claude Code sessions. This is much more efficient and accurate than polling or file watching.

## Architecture

```
Claude Code Event → Hook → curl → Menu Bar App HTTP Server → Notification
```

1. **Claude Code generates an event** (Stop, SubagentStop, PostToolUse, etc.)
2. **Hook executes** based on configured matchers
3. **curl sends event data** to the menu bar app's HTTP server
4. **Menu bar app processes the event** and shows a notification

## Installation

### Automatic Installation

Run the installation script:

```bash
./hooks/install-hooks.sh
```

This will:
- Backup your existing hooks configuration (if any)
- Install the hook configuration to `~/.config/claude-code/hooks.json`
- Configure hooks for Stop, SubagentStop, and PostToolUse events

### Manual Installation

If you prefer to install manually or already have hooks configured:

1. Copy or merge the contents of `hooks/claude-code-hooks.json` into your Claude Code hooks configuration at `~/.config/claude-code/hooks.json`

2. Ensure the menu bar app is running (it listens on `http://localhost:3456`)

## Configured Events

### Stop Event
Triggers when Claude finishes responding to your prompt.

**Notification:** "Claude Code finished responding"

### SubagentStop Event
Triggers when a task agent completes its work.

**Notification:** "Claude Code task completed"

### PostToolUse Events
Triggers after specific tools complete:
- **Bash**: Command execution completed
- **Task**: Task agent completed

**Notification:** Shows the tool name and context

## Customization

### Adding More Tools

To get notifications for other tools (e.g., Edit, Write, Read), add them to the `PostToolUse` section:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST http://localhost:3456/hook -H 'Content-Type: application/json' -d '{\"event\":\"PostToolUse\",\"tool\":\"Edit\",\"timestamp\":\"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'\"}' > /dev/null 2>&1 &"
          }
        ]
      }
    ]
  }
}
```

### Changing the Port

If you need to use a different port:

1. The menu bar app will automatically try the next available port if 3456 is in use
2. Check the menu to see which port is being used (shown as "Server: localhost:XXXX")
3. Update your hooks configuration to use that port instead

### Disabling Specific Events

To disable notifications for a specific event, remove that section from your hooks configuration or comment it out.

### Event Data Format

The menu bar app expects JSON data in this format:

```json
{
  "event": "Stop|SubagentStop|PostToolUse",
  "tool": "ToolName",  // Optional, for PostToolUse events
  "context": "Additional context",  // Optional
  "timestamp": "2025-01-15T10:30:00Z"  // Optional
}
```

## Troubleshooting

### Notifications Not Working

1. **Check if the menu bar app is running**
   - Look for the icon in your menu bar
   - Check if notifications are enabled in the menu

2. **Verify the hook server is running**
   - Click the menu bar icon
   - Look for "Server: localhost:XXXX" in the notifications section

3. **Test the hook endpoint manually**
   ```bash
   curl -X POST http://localhost:3456/hook \
     -H 'Content-Type: application/json' \
     -d '{"event":"Stop","timestamp":"2025-01-15T10:30:00Z"}'
   ```

   If this shows a notification, your hooks configuration needs attention.

4. **Check hooks are installed**
   ```bash
   cat ~/.config/claude-code/hooks.json
   ```

   You should see the hook configurations.

5. **Check Claude Code logs**
   Hooks execute in the background. If they fail, check Claude Code's output for error messages.

### Port Conflicts

If port 3456 is already in use:
- The menu bar app will automatically try the next port (3457, 3458, etc.)
- Check the menu to see which port is being used
- Update your hooks configuration if needed

## Security Note

The hook server only listens on `localhost` (127.0.0.1) and is not accessible from other machines. It accepts JSON events and processes them locally.

## Advanced Usage

### Custom Notifications

You can send custom notifications by posting to the hook endpoint:

```bash
curl -X POST http://localhost:3456/hook \
  -H 'Content-Type: application/json' \
  -d '{
    "event": "PostToolUse",
    "tool": "MyCustomTool",
    "context": "Operation completed successfully"
  }'
```

### Integration with Other Tools

Since the hook server accepts HTTP POST requests, you can integrate it with:
- CI/CD pipelines
- Build scripts
- Test runners
- Any tool that can make HTTP requests

## Further Reading

- [Claude Code Hooks Documentation](https://docs.claude.com/en/docs/claude-code/hooks.md)
- [Claude Code Hooks Guide](https://docs.claude.com/en/docs/claude-code/hooks-guide.md)

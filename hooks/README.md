# Claude Code Hooks Setup

This directory contains hook scripts that integrate the menu bar app with Claude Code.

## What are Claude Code Hooks?

Claude Code hooks are shell commands that execute automatically when certain events occur in Claude Code, such as:
- **Stop**: When Claude finishes responding
- **SessionStart**: When a new session starts
- **SessionEnd**: When a session ends

## How It Works

1. **Hook Script** (`claude-hook.js`): Node.js script that receives hook events from Claude Code
2. **IPC Communication**: Sends events to the menu bar app via Unix socket
3. **Notification**: App receives events and triggers notifications

## Installation

Run the installation script to set up hooks in your Claude Code settings:

```bash
cd hooks
./install-hooks.sh
```

This will:
- Make hook scripts executable
- Add hook configuration to `~/.claude/settings.json`
- Configure hooks for Stop, SessionStart, and SessionEnd events

## Uninstallation

To remove the hooks:

```bash
cd hooks
./uninstall-hooks.sh
```

## Manual Setup

If the installation script doesn't work, manually add this to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/claudecode-macmenu/hooks/claude-hook.js"
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/claudecode-macmenu/hooks/claude-hook.js"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/claudecode-macmenu/hooks/claude-hook.js"
          }
        ]
      }
    ]
  }
}
```

Replace `/path/to/claudecode-macmenu` with the actual path to this repository.

## Verification

After installation:

1. Start the menu bar app
2. Use Claude Code
3. When Claude finishes responding, you should:
   - See a notification
   - Hear a sound (if enabled)
   - See the console log: "Received hook event: Stop"

## Troubleshooting

**No notifications:**
- Check if hooks are installed: `cat ~/.claude/settings.json`
- Verify hook script is executable: `ls -la hooks/`
- Check menu bar app logs for "Hook server started"
- Ensure Node.js is installed (required for hook script)

**Hook not executing:**
- Verify the path in settings.json is correct
- Check Claude Code console for hook errors
- Try running the hook script manually: `echo '{}' | node hooks/claude-hook.js`

**Permission errors:**
- Make scripts executable: `chmod +x hooks/*.sh hooks/*.js`
- Check socket file permissions (auto-created by the app)

## How Hooks Work Internally

1. **Claude Code** triggers the Stop event
2. **Hook script** (`claude-hook.js`) receives JSON data on stdin
3. **Script** connects to Unix socket at `/tmp/claudecode-macmenu.sock`
4. **Message** is sent as JSON: `{"event": "Stop", "timestamp": "...", ...}`
5. **Menu bar app** receives message via `HookServer`
6. **App** triggers notification and refreshes analytics

## Security

- Hooks run locally on your machine
- No data is sent to external servers
- Hook script only communicates with the menu bar app
- Socket file is created in `/tmp` with proper permissions

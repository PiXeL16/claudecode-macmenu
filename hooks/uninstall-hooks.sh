#!/usr/bin/env bash

#
# Uninstallation script for Claude Code hooks
# Removes claudecode-macmenu hooks from ~/.claude/settings.json
#

set -e

CLAUDE_SETTINGS_FILE="$HOME/.claude/settings.json"

echo "Uninstalling Claude Code hooks for claudecode-macmenu..."

if [ ! -f "$CLAUDE_SETTINGS_FILE" ]; then
  echo "No settings file found at $CLAUDE_SETTINGS_FILE"
  exit 0
fi

# Use Python to remove hooks
if command -v python3 &> /dev/null; then
  python3 <<PYTHON
import json

with open('$CLAUDE_SETTINGS_FILE', 'r') as f:
    settings = json.load(f)

if 'hooks' in settings:
    # Remove our hook entries
    hook_script = 'claude-hook.js'

    for event in ['Stop', 'SessionStart', 'SessionEnd']:
        if event in settings['hooks']:
            # Filter out hooks that reference our script
            settings['hooks'][event] = [
                hook_entry for hook_entry in settings['hooks'][event]
                if not any(
                    hook_script in h.get('command', '')
                    for h in hook_entry.get('hooks', [])
                )
            ]
            # Remove event if no hooks left
            if not settings['hooks'][event]:
                del settings['hooks'][event]

    # Remove hooks key if empty
    if not settings['hooks']:
        del settings['hooks']

with open('$CLAUDE_SETTINGS_FILE', 'w') as f:
    json.dump(settings, f, indent=2)

print("Hooks removed successfully")
PYTHON

  echo "✅ Hooks uninstalled successfully!"
else
  echo "Warning: python3 not found. Manual removal required."
  echo "Please edit $CLAUDE_SETTINGS_FILE and remove claudecode-macmenu hook entries."
  exit 1
fi

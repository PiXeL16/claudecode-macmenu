#!/usr/bin/env bash

#
# Installation script for Claude Code hooks
# This sets up the hooks in ~/.claude/settings.json
#

set -e

CLAUDE_SETTINGS_DIR="$HOME/.claude"
CLAUDE_SETTINGS_FILE="$CLAUDE_SETTINGS_DIR/settings.json"
HOOK_SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)/claude-hook.js"

echo "Installing Claude Code hooks for claudecode-macmenu..."
echo "Hook script: $HOOK_SCRIPT_PATH"

# Make hook script executable
chmod +x "$HOOK_SCRIPT_PATH"

# Create .claude directory if it doesn't exist
mkdir -p "$CLAUDE_SETTINGS_DIR"

# Check if settings file exists
if [ ! -f "$CLAUDE_SETTINGS_FILE" ]; then
  echo "Creating new settings file..."
  echo '{}' > "$CLAUDE_SETTINGS_FILE"
fi

# Read existing settings
SETTINGS=$(cat "$CLAUDE_SETTINGS_FILE")

# Create hook configuration
HOOK_CONFIG=$(cat <<EOF
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node '$HOOK_SCRIPT_PATH'"
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node '$HOOK_SCRIPT_PATH'"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node '$HOOK_SCRIPT_PATH'"
          }
        ]
      }
    ]
  }
}
EOF
)

# Merge with existing settings using jq if available, otherwise use Python
if command -v jq &> /dev/null; then
  echo "Using jq to merge settings..."
  echo "$SETTINGS" | jq --argjson new "$HOOK_CONFIG" '. * $new' > "$CLAUDE_SETTINGS_FILE"
elif command -v python3 &> /dev/null; then
  echo "Using Python to merge settings..."
  python3 <<PYTHON
import json
import sys

with open('$CLAUDE_SETTINGS_FILE', 'r') as f:
    settings = json.load(f)

new_config = $HOOK_CONFIG

# Merge hooks
if 'hooks' not in settings:
    settings['hooks'] = {}

settings['hooks'].update(new_config['hooks'])

with open('$CLAUDE_SETTINGS_FILE', 'w') as f:
    json.dump(settings, f, indent=2)

print("Settings updated successfully")
PYTHON
else
  echo "Warning: Neither jq nor python3 found. Manual setup required."
  echo ""
  echo "Please add the following to $CLAUDE_SETTINGS_FILE:"
  echo "$HOOK_CONFIG"
  exit 1
fi

echo ""
echo "✅ Hooks installed successfully!"
echo ""
echo "The following hooks have been configured:"
echo "  - Stop: Triggers when Claude Code finishes a response"
echo "  - SessionStart: Triggers when a session starts"
echo "  - SessionEnd: Triggers when a session ends"
echo ""
echo "The menu bar app will now receive notifications when Claude Code completes tasks."
echo ""
echo "To verify installation, check: $CLAUDE_SETTINGS_FILE"

#!/bin/bash
# Install Claude Code hooks for the menu bar app notifications

set -e

CLAUDE_SETTINGS_DIR="$HOME/.config/claude-code"
HOOKS_FILE="$CLAUDE_SETTINGS_DIR/hooks.json"
BACKUP_FILE="$CLAUDE_SETTINGS_DIR/hooks.json.backup"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Claude Code Hooks Installer"
echo "============================"
echo ""

# Check if Claude Code settings directory exists
if [ ! -d "$CLAUDE_SETTINGS_DIR" ]; then
  echo -e "${YELLOW}Warning: Claude Code settings directory not found at $CLAUDE_SETTINGS_DIR${NC}"
  echo "Creating directory..."
  mkdir -p "$CLAUDE_SETTINGS_DIR"
fi

# Backup existing hooks file if it exists
if [ -f "$HOOKS_FILE" ]; then
  echo -e "${YELLOW}Backing up existing hooks.json to hooks.json.backup${NC}"
  cp "$HOOKS_FILE" "$BACKUP_FILE"
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SOURCE_HOOKS="$SCRIPT_DIR/claude-code-hooks.json"

# Copy hooks configuration
if [ -f "$SOURCE_HOOKS" ]; then
  echo "Installing hooks configuration..."
  cp "$SOURCE_HOOKS" "$HOOKS_FILE"
  echo -e "${GREEN}✓ Hooks installed successfully!${NC}"
else
  echo -e "${RED}Error: claude-code-hooks.json not found in $SCRIPT_DIR${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Start the Claude Code Menu Bar app"
echo "2. The app will listen on http://localhost:3456"
echo "3. Claude Code will now send notifications when:"
echo "   - Claude finishes responding (Stop event)"
echo "   - A task agent completes (SubagentStop event)"
echo "   - Bash or Task tools complete (PostToolUse events)"
echo ""
echo "To customize which events trigger notifications, edit:"
echo "  $HOOKS_FILE"
echo ""
echo "To restore your previous hooks configuration:"
echo "  cp $BACKUP_FILE $HOOKS_FILE"

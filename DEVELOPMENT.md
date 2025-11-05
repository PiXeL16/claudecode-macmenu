# Development Guide

## Project Structure

```
claudecode-macmenu/
├── src/
│   ├── main.ts              # Main Electron process & tray setup
│   └── services/
│       ├── analytics.ts     # Session tracking & statistics
│       ├── notification.ts  # Sound & system notifications
│       └── settings.ts      # User preferences management
├── assets/                  # Icons and resources
├── dist/                    # Compiled JavaScript (generated)
└── build/                   # Build artifacts (generated)
```

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm or yarn
- macOS (for full menu bar functionality)

### Installation

```bash
npm install
```

### Development

```bash
# Build and run
npm run dev

# Watch mode (auto-rebuild on changes)
npm run watch
# Then in another terminal:
npm start
```

### Building

```bash
# Compile TypeScript
npm run build

# Package for distribution
npm run package
```

## Architecture

### Main Process (main.ts)

- Initializes the Electron app
- Creates and manages the menu bar tray icon
- Coordinates between services
- Handles app lifecycle events

### Services

#### AnalyticsService

Tracks usage statistics:
- Session count (total and daily)
- Session duration
- Total active time
- Average session length

Data is stored in: `~/Library/Application Support/claudecode-macmenu/analytics.json`

#### NotificationService

Manages notifications:
- System notifications
- Sound playback
- Uses macOS system sounds by default
- Respects user preferences

#### SettingsManager

Handles user preferences:
- Enable/disable notifications
- Enable/disable sounds
- Sound selection
- Theme preference
- Auto-start configuration

Settings stored in: `~/Library/Application Support/claudecode-macmenu/settings.json`

## Future Enhancements

### Planned Features

1. **Claude Code Integration**
   - Monitor Claude Code log files
   - Detect when tasks complete
   - Parse session information

2. **Enhanced Analytics**
   - Daily/weekly/monthly charts
   - Export statistics to CSV/JSON
   - Activity timeline

3. **Preferences Window**
   - GUI for settings
   - Sound preview
   - Custom sound upload
   - Advanced notification options

4. **Auto-start**
   - Launch at login
   - Start minimized

5. **Themes**
   - Custom icon colors
   - Dark/light mode support

## Testing

To test the notification system:
- Click the menu bar icon
- Select "Test Notification"
- You should see a system notification and hear the sound (if enabled)

## Debugging

To view console logs:
```bash
# The app logs to stdout
npm run dev
```

To inspect the Electron app:
- The app runs without a main window
- Console logs appear in the terminal
- Check `~/Library/Application Support/claudecode-macmenu/` for data files

## Distribution

To create a distributable package:

```bash
npm run package
```

This creates:
- `.dmg` file for distribution
- `.zip` file for manual installation

The packaged app will be in the `build/` directory.

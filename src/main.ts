import { app, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { AnalyticsService } from './services/analytics';
import { NotificationService } from './services/notification';
import { SettingsManager } from './services/settings';

let tray: Tray | null = null;
let analyticsService: AnalyticsService;
let notificationService: NotificationService;
let settingsManager: SettingsManager;

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.dock?.hide(); // Hide from dock on macOS

app.whenReady().then(() => {
  initializeServices();
  createTray();
});

app.on('window-all-closed', (e: Event) => {
  e.preventDefault();
});

function initializeServices() {
  settingsManager = new SettingsManager();
  analyticsService = new AnalyticsService(settingsManager);
  notificationService = new NotificationService(settingsManager);

  // Start session tracking
  analyticsService.startSession();
}

function createTray() {
  // Create a simple icon (we'll use a template icon for proper macOS theming)
  const icon = createTrayIcon();

  tray = new Tray(icon);
  tray.setToolTip('Claude Code Menu');

  updateTrayMenu();

  // Update menu periodically to show live stats
  setInterval(() => {
    updateTrayMenu();
  }, 60000); // Update every minute
}

function createTrayIcon(): nativeImage {
  // Create a simple 16x16 template icon
  // Template icons automatically adapt to light/dark mode
  const iconPath = path.join(__dirname, '../assets/icon-template.png');

  // For now, create a simple representation
  // In production, you'd want a proper icon file
  const icon = nativeImage.createEmpty();
  return icon;
}

function updateTrayMenu() {
  if (!tray) return;

  const stats = analyticsService.getStats();
  const settings = settingsManager.getSettings();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '📊 Claude Code Statistics',
      enabled: false
    },
    { type: 'separator' },
    {
      label: `Sessions Today: ${stats.sessionsToday}`,
      enabled: false
    },
    {
      label: `Total Sessions: ${stats.totalSessions}`,
      enabled: false
    },
    {
      label: `Active Time: ${formatDuration(stats.currentSessionDuration)}`,
      enabled: false
    },
    {
      label: `Total Time: ${formatDuration(stats.totalDuration)}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: '🔔 Notifications',
      type: 'checkbox',
      checked: settings.notificationsEnabled,
      click: () => {
        settingsManager.updateSettings({
          notificationsEnabled: !settings.notificationsEnabled
        });
        updateTrayMenu();
      }
    },
    {
      label: '🔊 Sound',
      type: 'checkbox',
      checked: settings.soundEnabled,
      click: () => {
        settingsManager.updateSettings({
          soundEnabled: !settings.soundEnabled
        });
        updateTrayMenu();
      }
    },
    { type: 'separator' },
    {
      label: 'Test Notification',
      click: () => {
        notificationService.notifyTaskComplete('Test task completed!');
      }
    },
    { type: 'separator' },
    {
      label: 'Preferences...',
      click: () => {
        // TODO: Open preferences window
        console.log('Open preferences');
      }
    },
    {
      label: 'Reset Statistics',
      click: () => {
        analyticsService.resetStats();
        updateTrayMenu();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        analyticsService.endSession();
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

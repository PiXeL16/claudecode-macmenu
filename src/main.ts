import { app, Tray, Menu, nativeImage, Notification } from 'electron';
import * as path from 'path';
import { AnalyticsService } from './services/analytics';
import { NotificationService } from './services/notification';
import { SettingsManager } from './services/settings';
import { HookServer, HookMessage } from './services/hookServer';

let tray: Tray | null = null;
let analyticsService: AnalyticsService;
let notificationService: NotificationService;
let settingsManager: SettingsManager;
let hookServer: HookServer;
let lastMessageCount = 0;

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

async function initializeServices() {
  settingsManager = new SettingsManager();
  analyticsService = new AnalyticsService();
  notificationService = new NotificationService(settingsManager);

  // Setup auto-refresh for analytics (menu display)
  analyticsService.setupAutoRefresh(() => {
    updateTrayMenu();
  });

  // Start hook server for Claude Code integration
  hookServer = new HookServer();
  try {
    await hookServer.start(handleHookMessage);
    console.log('Hook server started successfully');
    console.log('Socket path:', hookServer.getSocketPath());
  } catch (error) {
    console.error('Failed to start hook server:', error);
  }
}

/**
 * Handle hook messages from Claude Code
 */
function handleHookMessage(message: HookMessage) {
  console.log('Received hook event:', message.event);

  // Trigger notification on Stop event (when Claude finishes responding)
  if (message.event === 'Stop') {
    notificationService.notifyTaskComplete('Claude Code has finished working');

    // Refresh analytics to show updated stats
    analyticsService.refreshStats().then(() => {
      updateTrayMenu();
    });
  }

  // Handle session events
  if (message.event === 'SessionStart') {
    console.log('Claude Code session started');
    analyticsService.refreshStats().then(() => {
      updateTrayMenu();
    });
  }

  if (message.event === 'SessionEnd') {
    console.log('Claude Code session ended');
    analyticsService.refreshStats().then(() => {
      updateTrayMenu();
    });
  }
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
  }, 30000); // Update every 30 seconds
}

function createTrayIcon(): nativeImage {
  // Create a simple 16x16 template icon
  // Template icons automatically adapt to light/dark mode
  const iconPath = path.join(__dirname, '../assets/icon-template.png');

  // Try to load the icon, otherwise create an empty one
  try {
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      return icon;
    }
  } catch (error) {
    console.log('Icon file not found, using empty icon');
  }

  // For now, create a simple representation
  // In production, you'd want a proper icon file
  const icon = nativeImage.createEmpty();
  return icon;
}

function updateTrayMenu() {
  if (!tray) return;

  const stats = analyticsService.getStatsSync();
  const settings = settingsManager.getSettings();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '📊 Claude Code Usage',
      enabled: false
    },
    { type: 'separator' },
    {
      label: '💬 Messages',
      enabled: false
    },
    {
      label: `  Today: ${stats.messagesToday}`,
      enabled: false
    },
    {
      label: `  Total: ${stats.messagesCount}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: '🎯 Tokens',
      enabled: false
    },
    {
      label: `  Today: ${formatNumber(stats.totalTokensToday)}`,
      enabled: false
    },
    {
      label: `  Total: ${formatNumber(stats.totalTokensAllTime)}`,
      enabled: false
    },
    {
      label: `  Current Session: ${formatNumber(stats.currentSessionTokens)}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: '💰 Costs',
      enabled: false
    },
    {
      label: `  Today: $${stats.totalCostToday.toFixed(2)}`,
      enabled: false
    },
    {
      label: `  Total: $${stats.totalCostAllTime.toFixed(2)}`,
      enabled: false
    },
    {
      label: `  Current Session: $${stats.currentSessionCost.toFixed(2)}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: '🔥 Burn Rate',
      enabled: false
    },
    {
      label: `  ${Math.round(stats.currentBurnRate.tokens_per_minute)} tokens/min`,
      enabled: false
    },
    {
      label: `  $${stats.currentBurnRate.cost_per_hour.toFixed(2)}/hour`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: '📅 Sessions (5h blocks)',
      enabled: false
    },
    {
      label: `  Today: ${stats.sessionsToday}`,
      enabled: false
    },
    {
      label: `  Total: ${stats.totalSessions}`,
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
      label: 'Model Breakdown',
      submenu: createModelBreakdownMenu(stats.modelBreakdown)
    },
    { type: 'separator' },
    {
      label: 'Test Notification',
      click: () => {
        notificationService.notifyTaskComplete('Test task completed!');
      }
    },
    {
      label: 'Refresh Stats',
      click: async () => {
        await analyticsService.refreshStats();
        updateTrayMenu();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        // Clean up hook server
        if (hookServer) {
          hookServer.stop();
        }
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function createModelBreakdownMenu(modelBreakdown: any): any[] {
  const models = Object.keys(modelBreakdown);

  if (models.length === 0) {
    return [{
      label: 'No data yet',
      enabled: false
    }];
  }

  return models.map(model => {
    const tokens = modelBreakdown[model];
    const total = tokens.input_tokens + tokens.output_tokens +
                  (tokens.cache_creation_tokens || 0) + (tokens.cache_read_tokens || 0);

    return {
      label: `${model}: ${formatNumber(total)} tokens`,
      enabled: false
    };
  });
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
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

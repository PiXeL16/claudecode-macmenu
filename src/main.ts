import { app, Tray, Menu, nativeImage, Notification, NativeImage, dialog } from 'electron';
import * as path from 'path';
import { AnalyticsService } from './services/analytics';
import { NotificationService } from './services/notification';
import { SettingsManager } from './services/settings';
import { HookServer } from './services/hookServer';
import { InstallerService } from './services/installer';

let tray: Tray | null = null;
let analyticsService: AnalyticsService;
let notificationService: NotificationService;
let settingsManager: SettingsManager;
let hookServer: HookServer;
let installerService: InstallerService;

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.dock?.hide(); // Hide from dock on macOS

app.whenReady().then(async () => {
  await initializeServices();
  createTray();
});

app.on('window-all-closed', (e: Event) => {
  e.preventDefault();
});

async function initializeServices() {
  settingsManager = new SettingsManager();
  analyticsService = new AnalyticsService();
  notificationService = new NotificationService(settingsManager);
  hookServer = new HookServer(notificationService);
  installerService = new InstallerService();

  // Start the hook server to receive notifications from Claude Code
  try {
    await hookServer.start();
    console.log(`Hook server started on port ${hookServer.getPort()}`);
  } catch (error) {
    console.error('Failed to start hook server:', error);
  }

  // Setup auto-refresh for analytics (no more message count checking)
  analyticsService.setupAutoRefresh(() => {
    updateTrayMenu();
  });

  // Check if hooks are installed and prompt user if not
  checkHooksOnStartup();
}

async function checkHooksOnStartup() {
  const settings = settingsManager.getSettings();
  if (settings.skipHooksPrompt) {
    return;
  }

  const hooksInstalled = await installerService.checkHooksInstalled();
  if (!hooksInstalled) {
    setTimeout(() => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Claude Code Hooks Setup',
        message: 'Welcome to Claude Code Menu!',
        detail: 'To enable real-time notifications, you need to install Claude Code hooks.\n\nWould you like to install them now?',
        buttons: ['Install Hooks', 'Remind Me Later', 'Don\'t Ask Again'],
        defaultId: 0
      }).then(async result => {
        if (result.response === 0) {
          // Install hooks
          const installResult = await installerService.installHooks(hookServer.getPort());
          dialog.showMessageBox({
            type: installResult.success ? 'info' : 'error',
            title: installResult.success ? 'Success' : 'Error',
            message: installResult.message
          });
        } else if (result.response === 2) {
          // Don't ask again
          settingsManager.updateSettings({ skipHooksPrompt: true });
        }
      });
    }, 2000); // Wait 2 seconds after app starts
  }
}

// Cleanup on app quit
app.on('will-quit', () => {
  if (hookServer) {
    hookServer.stop();
  }
});

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

function createTrayIcon(): NativeImage {
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
      label: '🔔 Notifications (Hook-based)',
      enabled: false
    },
    {
      label: `  Server: localhost:${hookServer.getPort()}`,
      enabled: false
    },
    {
      label: '  Enabled',
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
      label: '  Sound',
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
      label: 'Setup',
      submenu: [
        {
          label: 'Install Hooks...',
          click: async () => {
            const result = await installerService.installHooks(hookServer.getPort());
            dialog.showMessageBox({
              type: result.success ? 'info' : 'error',
              title: result.success ? 'Success' : 'Error',
              message: result.message
            });
            updateTrayMenu();
          }
        },
        {
          label: 'Open Hooks Config',
          click: () => {
            installerService.openHooksConfig();
          }
        },
        {
          label: 'Restore Hooks Backup',
          click: async () => {
            const result = await installerService.restoreHooksBackup();
            dialog.showMessageBox({
              type: result.success ? 'info' : 'error',
              title: result.success ? 'Success' : 'Error',
              message: result.message
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Start at Login',
          type: 'checkbox',
          checked: installerService.getLoginItemSettings(),
          click: () => {
            const current = installerService.getLoginItemSettings();
            installerService.setLoginItemSettings(!current);
            updateTrayMenu();
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
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

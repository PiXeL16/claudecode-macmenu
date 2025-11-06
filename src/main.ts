// ABOUTME: Main Electron application entry point for the Claude Code Mac menu bar app
// ABOUTME: Manages tray icon, menu, services initialization, and coordinates all application features
import { app, Tray, Menu, nativeImage, Notification, NativeImage, dialog } from 'electron';
import * as path from 'path';
import { AnalyticsService } from './services/analytics';
import { NotificationService } from './services/notification';
import { SettingsManager } from './services/settings';
import { HookServer } from './services/hookServer';
import { InstallerService } from './services/installer';
import { PreferencesWindow } from './windows/preferences';
import { AnalyticsWindow } from './windows/analytics';
import { UsageReader } from './services/usageReader';

let tray: Tray | null = null;
let analyticsService: AnalyticsService;
let notificationService: NotificationService;
let settingsManager: SettingsManager;
let hookServer: HookServer;
let installerService: InstallerService;
let preferencesWindow: PreferencesWindow;
let analyticsWindow: AnalyticsWindow;
let usageReader: UsageReader;
let menuUpdateInterval: NodeJS.Timeout | null = null;

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.dock?.hide(); // Hide from dock on macOS

// Set app name for notifications
app.setName('Claude Code Menu');

app.whenReady().then(async () => {
  // Set the app icon - macOS will use this for notifications
  const appIconPath = path.join(__dirname, '../assets/icon.icns');
  const appIcon = nativeImage.createFromPath(appIconPath);
  if (!appIcon.isEmpty() && app.dock) {
    app.dock.setIcon(appIcon);
  }

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
  hookServer = new HookServer(notificationService, analyticsService);
  installerService = new InstallerService();
  usageReader = new UsageReader();
  analyticsWindow = new AnalyticsWindow(usageReader);
  preferencesWindow = new PreferencesWindow(
    settingsManager,
    notificationService,
    installerService,
    hookServer.getPort(),
    () => updateTrayMenu()
  );

  // Start the hook server to receive notifications from Claude Code
  try {
    await hookServer.start();
    console.log(`Hook server started on port ${hookServer.getPort()}`);
  } catch (error) {
    console.error('Failed to start hook server:', error);
  }

  // Setup auto-refresh for analytics (menu updates only)
  // Notifications are handled by hookServer when Stop/SubagentStop events fire
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

// Cleanup on app quit to prevent memory leaks
app.on('will-quit', () => {
  console.log('App quitting, cleaning up resources...');

  // Stop hook server
  if (hookServer) {
    hookServer.stop();
  }

  // Clean up analytics service (file watchers, intervals, timers)
  if (analyticsService) {
    analyticsService.cleanup();
  }

  // Clear menu update interval
  if (menuUpdateInterval) {
    clearInterval(menuUpdateInterval);
    menuUpdateInterval = null;
  }
});

function createTray() {
  // Create a simple icon (we'll use a template icon for proper macOS theming)
  const icon = createTrayIcon();

  tray = new Tray(icon);
  tray.setToolTip('Claude Code Menu');

  updateTrayMenu();

  // Update menu periodically to show live stats
  menuUpdateInterval = setInterval(() => {
    updateTrayMenu();
  }, 30000); // Update every 30 seconds
}

function createTrayIcon(): NativeImage {
  // Load the colored Clauwd icon (16x16, with @2x for Retina)
  const iconPath = path.join(__dirname, '../assets/menubar-icon.png');

  try {
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      // Don't set as template - we want to keep the color!
      icon.setTemplateImage(false);
      return icon;
    }
  } catch (error) {
    console.log('Icon file not found:', error);
  }

  // Fallback to empty icon
  const icon = nativeImage.createEmpty();
  return icon;
}

function updateTrayMenu() {
  if (!tray) return;

  const stats = analyticsService.getStatsSync();
  const settings = settingsManager.getSettings();
  const vis = settings.menuVisibility;
  const compactMode = vis?.compactMode || false;

  const menuItems: any[] = [
    {
      label: '📊 Analytics',
      accelerator: 'Command+A',
      click: () => {
        analyticsWindow.show();
      }
    },
    { type: 'separator' }
  ];

  // Messages section
  if (vis?.showMessages !== false) {
    menuItems.push({
      label: `💬 Today: ${stats.messagesToday} msgs | Total: ${stats.messagesCount} msgs`,
      enabled: true,
      click: () => {} // No-op click to make it appear enabled
    });
  }

  // Tokens section
  if (vis?.showTokens !== false) {
    const tokenLabel = compactMode
      ? `🎯 Today: ${formatNumber(stats.totalTokensToday)} tokens`
      : `🎯 Today: ${formatNumber(stats.totalTokensToday)} | Total: ${formatNumber(stats.totalTokensAllTime)} | Session: ${formatNumber(stats.currentSessionTokens)}`;
    menuItems.push({
      label: tokenLabel,
      enabled: true,
      click: () => {}
    });
  }

  // Costs section
  if (vis?.showCosts !== false) {
    const costLabel = compactMode
      ? `💰 Today: $${stats.totalCostToday.toFixed(2)}`
      : `💰 Today: $${stats.totalCostToday.toFixed(2)} | Total: $${stats.totalCostAllTime.toFixed(2)} | Session: $${stats.currentSessionCost.toFixed(2)}`;
    menuItems.push({
      label: costLabel,
      enabled: true,
      click: () => {}
    });
  }

  // Burn Rate section
  if (vis?.showBurnRate !== false) {
    const burnLabel = compactMode
      ? `🔥 ${Math.round(stats.currentBurnRate.tokens_per_minute)} tokens/min`
      : `🔥 ${Math.round(stats.currentBurnRate.tokens_per_minute)} tokens/min | $${stats.currentBurnRate.cost_per_hour.toFixed(2)}/hour`;
    menuItems.push({
      label: burnLabel,
      enabled: true,
      click: () => {}
    });
  }

  // Sessions section
  if (vis?.showSessions !== false) {
    const sessionLabel = compactMode
      ? `📅 Today: ${stats.sessionsToday} sessions`
      : `📅 Today: ${stats.sessionsToday} | Total: ${stats.totalSessions} sessions (5h blocks)`;
    menuItems.push({
      label: sessionLabel,
      enabled: true,
      click: () => {}
    });
  }

  // Model Breakdown section
  if (vis?.showModelBreakdown !== false && !compactMode) {
    menuItems.push({ type: 'separator' });
    menuItems.push({
      label: 'Model Breakdown',
      submenu: createModelBreakdownMenu(stats.modelBreakdown)
    });
  }

  // Bottom actions
  menuItems.push({ type: 'separator' });
  menuItems.push({
    label: 'Refresh Stats',
    click: async () => {
      await analyticsService.refreshStats();
      updateTrayMenu();
    }
  });
  menuItems.push({ type: 'separator' });
  menuItems.push({
    label: 'Preferences...',
    accelerator: 'Command+,',
    click: () => {
      preferencesWindow.show();
    }
  });
  menuItems.push({
    label: 'Quit',
    click: () => {
      app.quit();
    }
  });

  const contextMenu = Menu.buildFromTemplate(menuItems);
  tray.setContextMenu(contextMenu);
}

function createModelBreakdownMenu(modelBreakdown: any): any[] {
  const models = Object.keys(modelBreakdown);

  if (models.length === 0) {
    return [{
      label: 'No data yet',
      enabled: true,
      click: () => {}
    }];
  }

  return models.map(model => {
    const tokens = modelBreakdown[model];
    const total = tokens.input_tokens + tokens.output_tokens +
                  (tokens.cache_creation_tokens || 0) + (tokens.cache_read_tokens || 0);

    return {
      label: `${model}: ${formatNumber(total)} tokens`,
      enabled: true,
      click: () => {}
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

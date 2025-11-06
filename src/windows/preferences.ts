// ABOUTME: Preferences window manager for app settings and configuration
// ABOUTME: Implements singleton pattern and handles IPC communication with renderer process
import { BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import { SettingsManager } from '../services/settings';
import { NotificationService } from '../services/notification';
import { InstallerService } from '../services/installer';

export class PreferencesWindow {
  private static instance: BrowserWindow | null = null;
  private ipcHandlersRegistered = false;
  private readonly IPC_HANDLERS = [
    'get-settings',
    'update-settings',
    'reset-settings',
    'test-notification',
    'test-sound',
    'get-available-sounds',
    'check-notification-permission',
    'open-settings-file',
    'check-hooks-installed',
    'install-hooks',
    'open-hooks-config',
    'restore-hooks-backup'
  ];

  constructor(
    private settingsManager: SettingsManager,
    private notificationService: NotificationService,
    private installerService: InstallerService,
    private hookServerPort: number,
    private onSettingsChanged: () => void
  ) {
    this.setupIpcHandlers();
  }

  show(): void {
    if (PreferencesWindow.instance) {
      PreferencesWindow.instance.show();
      PreferencesWindow.instance.focus();
      return;
    }

    PreferencesWindow.instance = new BrowserWindow({
      width: 650,
      height: 550,
      resizable: true,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      show: false,
      title: 'Preferences',
      vibrancy: 'sidebar',
      backgroundColor: '#0a0a0a',  // Pure black terminal background
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    PreferencesWindow.instance.loadFile(path.join(__dirname, '../ui/preferences.html'));

    PreferencesWindow.instance.once('ready-to-show', () => {
      PreferencesWindow.instance?.show();
    });

    PreferencesWindow.instance.on('closed', () => {
      this.cleanup();
      PreferencesWindow.instance = null;
    });
  }

  private setupIpcHandlers(): void {
    // Only register handlers once to prevent leaks
    if (this.ipcHandlersRegistered) {
      return;
    }
    this.ipcHandlersRegistered = true;
    ipcMain.handle('get-settings', () => {
      return this.settingsManager.getSettings();
    });

    ipcMain.handle('update-settings', (event, updates) => {
      this.settingsManager.updateSettings(updates);
      this.onSettingsChanged();
      return true;
    });

    ipcMain.handle('reset-settings', () => {
      this.settingsManager.resetSettings();
      this.onSettingsChanged();
      return this.settingsManager.getSettings();
    });

    ipcMain.handle('test-notification', () => {
      this.notificationService.testNotification();
    });

    ipcMain.handle('test-sound', (event, soundFile: string) => {
      const { exec } = require('child_process');
      const sounds: { [key: string]: string } = {
        'glass': 'Glass',
        'hero': 'Hero',
        'blow': 'Blow',
        'bottle': 'Bottle',
        'frog': 'Frog',
        'funk': 'Funk',
        'ping': 'Ping',
        'pop': 'Pop',
        'purr': 'Purr',
        'submarine': 'Submarine',
        'basso': 'Basso',
        'morse': 'Morse',
        'sosumi': 'Sosumi',
        'tink': 'Tink'
      };

      const soundName = sounds[soundFile] || sounds['glass'];
      const soundPath = `/System/Library/Sounds/${soundName}.aiff`;
      exec(`afplay "${soundPath}"`);
    });

    ipcMain.handle('get-available-sounds', () => {
      return [
        { value: 'glass', label: 'Glass (Default)' },
        { value: 'hero', label: 'Hero' },
        { value: 'blow', label: 'Blow' },
        { value: 'bottle', label: 'Bottle' },
        { value: 'frog', label: 'Frog' },
        { value: 'funk', label: 'Funk' },
        { value: 'ping', label: 'Ping' },
        { value: 'pop', label: 'Pop' },
        { value: 'purr', label: 'Purr' },
        { value: 'submarine', label: 'Submarine' },
        { value: 'basso', label: 'Basso' },
        { value: 'morse', label: 'Morse' },
        { value: 'sosumi', label: 'Sosumi' },
        { value: 'tink', label: 'Tink' }
      ];
    });

    ipcMain.handle('check-notification-permission', () => {
      const { Notification } = require('electron');
      return Notification.isSupported();
    });

    ipcMain.handle('open-settings-file', () => {
      const settingsPath = this.settingsManager['settingsPath'];
      shell.openPath(settingsPath);
    });

    ipcMain.handle('check-hooks-installed', async () => {
      return await this.installerService.checkHooksInstalled();
    });

    ipcMain.handle('install-hooks', async () => {
      return await this.installerService.installHooks(this.hookServerPort);
    });

    ipcMain.handle('open-hooks-config', async () => {
      await this.installerService.openHooksConfig();
    });

    ipcMain.handle('restore-hooks-backup', async () => {
      return await this.installerService.restoreHooksBackup();
    });
  }

  /**
   * Clean up IPC handlers to prevent memory leaks
   */
  private cleanup(): void {
    if (!this.ipcHandlersRegistered) {
      return;
    }

    console.log('Cleaning up IPC handlers...');
    this.IPC_HANDLERS.forEach(handler => {
      ipcMain.removeHandler(handler);
    });
    this.ipcHandlersRegistered = false;
  }
}

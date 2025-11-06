// ABOUTME: Settings manager for persisting user preferences and application configuration
// ABOUTME: Handles loading, saving, and updating settings stored in JSON format
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface Settings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  soundFile: string;
  notificationTitleFormat: 'project' | 'path' | 'simple';
  autoStart: boolean;
  skipHooksPrompt?: boolean;
  notificationBody: {
    showSessionId: boolean;
    showTotalTokens: boolean;
    showTokenBreakdown: boolean;
    showCacheStats: boolean;
    showCost: boolean;
    showTimestamp: boolean;
    showStopReason: boolean;
    showResponsePreview: boolean;
    previewLength: number;
  };
  menuVisibility: {
    compactMode: boolean;
    showMessages: boolean;
    showTokens: boolean;
    showCosts: boolean;
    showBurnRate: boolean;
    showSessions: boolean;
    showModelBreakdown: boolean;
  };
  statsRefreshInterval: number; // seconds
}

const DEFAULT_SETTINGS: Settings = {
  notificationsEnabled: true,
  soundEnabled: true,
  soundFile: 'glass',
  notificationTitleFormat: 'path',
  autoStart: false,
  skipHooksPrompt: false,
  notificationBody: {
    showSessionId: true,
    showTotalTokens: true,
    showTokenBreakdown: false,
    showCacheStats: false,
    showCost: true,
    showTimestamp: true,
    showStopReason: false,
    showResponsePreview: false,
    previewLength: 100
  },
  menuVisibility: {
    compactMode: false,
    showMessages: true,
    showTokens: true,
    showCosts: true,
    showBurnRate: true,
    showSessions: true,
    showModelBreakdown: true
  },
  statsRefreshInterval: 30
};

export class SettingsManager {
  private settings: Settings;
  private settingsPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.settingsPath = path.join(userDataPath, 'settings.json');
    this.settings = this.loadSettings();
  }

  private loadSettings(): Settings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf-8');
        const userSettings = JSON.parse(data);

        // Deep merge to ensure nested objects have defaults
        return {
          ...DEFAULT_SETTINGS,
          ...userSettings,
          notificationBody: {
            ...DEFAULT_SETTINGS.notificationBody,
            ...(userSettings.notificationBody || {})
          },
          menuVisibility: {
            ...DEFAULT_SETTINGS.menuVisibility,
            ...(userSettings.menuVisibility || {})
          }
        };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try {
      const dir = path.dirname(this.settingsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  getSettings(): Settings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<Settings>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();
  }

  resetSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
  }
}

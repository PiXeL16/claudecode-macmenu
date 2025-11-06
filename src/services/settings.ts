// ABOUTME: Settings manager for persisting user preferences and application configuration
// ABOUTME: Handles loading, saving, and updating settings stored in JSON format
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface Settings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  soundFile: string;
  theme: 'light' | 'dark' | 'auto';
  autoStart: boolean;
  skipHooksPrompt?: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  notificationsEnabled: true,
  soundEnabled: true,
  soundFile: 'completion',
  theme: 'auto',
  autoStart: false,
  skipHooksPrompt: false
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
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
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

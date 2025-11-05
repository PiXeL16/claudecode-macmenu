import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface Settings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  soundFile: string;
  theme: 'light' | 'dark' | 'auto';
  autoStart: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  notificationsEnabled: true,
  soundEnabled: true,
  soundFile: 'default',
  theme: 'auto',
  autoStart: false
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

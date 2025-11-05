// ABOUTME: Service for displaying macOS native notifications when Claude Code tasks complete
// ABOUTME: Manages notification display, sound playback, and respects user settings
import { Notification } from 'electron';
import * as path from 'path';
import { SettingsManager } from './settings';

export class NotificationService {
  constructor(private settingsManager: SettingsManager) {}

  notifyTaskComplete(message: string = 'Claude Code has finished working'): void {
    const settings = this.settingsManager.getSettings();

    if (!settings.notificationsEnabled) {
      return;
    }

    // Show system notification
    const notification = new Notification({
      title: 'Claude Code Complete',
      body: message,
      silent: !settings.soundEnabled,
      sound: settings.soundEnabled ? this.getSoundPath(settings.soundFile) : undefined
    });

    notification.show();

    // Play custom sound if enabled
    if (settings.soundEnabled) {
      this.playSound(settings.soundFile);
    }
  }

  private getSoundPath(soundFile: string): string {
    // macOS system sounds
    const systemSounds: { [key: string]: string } = {
      'default': 'Glass',
      'glass': 'Glass',
      'hero': 'Hero',
      'blow': 'Blow',
      'bottle': 'Bottle',
      'frog': 'Frog',
      'funk': 'Funk',
      'ping': 'Ping',
      'pop': 'Pop',
      'purr': 'Purr',
      'submarine': 'Submarine'
    };

    return systemSounds[soundFile] || systemSounds['default'];
  }

  private playSound(soundFile: string): void {
    // On macOS, we can use the afplay command to play sounds
    const { exec } = require('child_process');
    const soundPath = `/System/Library/Sounds/${this.getSoundPath(soundFile)}.aiff`;

    exec(`afplay "${soundPath}"`, (error: Error | null) => {
      if (error) {
        console.error('Failed to play sound:', error);
      }
    });
  }

  // Test notification
  testNotification(): void {
    this.notifyTaskComplete('This is a test notification');
  }
}

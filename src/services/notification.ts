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
    const { app } = require('electron');
    const fs = require('fs');

    // Check for bundled sounds first
    const bundledSounds: { [key: string]: string } = {
      'completion': 'completion.wav',
      'subtle': 'subtle.wav',
      'classic': 'classic.wav',
      'alert': 'alert.wav',
      'success': 'success.wav'
    };

    if (bundledSounds[soundFile]) {
      const bundledPath = path.join(
        app.getAppPath(),
        'assets',
        'sounds',
        bundledSounds[soundFile]
      );
      if (fs.existsSync(bundledPath)) {
        return bundledPath;
      }
    }

    // Check for custom sounds in user directory
    const userSoundsDir = path.join(app.getPath('userData'), 'sounds');
    const customSoundPath = path.join(userSoundsDir, `${soundFile}.wav`);
    if (fs.existsSync(customSoundPath)) {
      return customSoundPath;
    }

    // Fall back to macOS system sounds
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

    const systemSoundName = systemSounds[soundFile] || systemSounds['default'];
    return `/System/Library/Sounds/${systemSoundName}.aiff`;
  }

  private playSound(soundFile: string): void {
    // Play sound using afplay command
    const { exec } = require('child_process');
    const soundPath = this.getSoundPath(soundFile);

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

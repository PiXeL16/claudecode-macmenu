// ABOUTME: Service for displaying macOS native notifications when Claude Code tasks complete
// ABOUTME: Manages notification display, sound playback, and respects user settings
import { Notification, nativeImage } from 'electron';
import * as path from 'path';
import { SettingsManager, Settings } from './settings';
import { UsageEntry, calculateCost, getTotalTokens } from '../types/usage';

export class NotificationService {
  private permissionsGranted: boolean = false;

  constructor(private settingsManager: SettingsManager) {
    this.checkNotificationPermissions();
  }

  private async checkNotificationPermissions(): Promise<void> {
    // Check if notifications are supported
    if (Notification.isSupported()) {
      // On macOS, we need to show at least one notification to trigger permission prompt
      // Let's just check the current state
      console.log('Notifications are supported');
      this.permissionsGranted = true;
    } else {
      console.error('Notifications are not supported on this system');
      this.permissionsGranted = false;
    }
  }

  notifyTaskComplete(message: string = 'Claude Code has finished working', entry?: UsageEntry): void {
    const settings = this.settingsManager.getSettings();

    if (!settings.notificationsEnabled) {
      console.log('Notifications disabled in settings');
      return;
    }

    if (!this.permissionsGranted) {
      console.log('Notification permissions not granted');
      return;
    }

    // Build notification title and body with entry details
    let notificationTitle = 'Claude Code Complete';
    let notificationBody = message;

    if (entry) {
      const tokens = {
        input_tokens: entry.input_tokens,
        output_tokens: entry.output_tokens,
        cache_creation_tokens: entry.cache_creation_tokens || 0,
        cache_read_tokens: entry.cache_read_tokens || 0
      };
      const totalTokens = getTotalTokens(tokens);
      const cost = calculateCost(tokens, entry.model);

      // Format model name (remove date suffix, keep short)
      const modelParts = entry.model.split('-');
      const modelName = modelParts.length >= 3 ? modelParts.slice(0, 3).join('-') : entry.model;

      // Build title based on user preference
      if (settings.notificationTitleFormat === 'simple') {
        notificationTitle = `Claude Code (${modelName})`;
      } else if (settings.notificationTitleFormat === 'path' && entry.cwd) {
        notificationTitle = `Claude Code: ${entry.cwd} (${modelName})`;
      } else {
        // 'project' or fallback
        const projectName = entry.cwd ? path.basename(entry.cwd) : 'Unknown';
        notificationTitle = `Claude Code: ${projectName} (${modelName})`;
      }

      // Build body based on user preferences
      notificationBody = this.buildNotificationBody(entry, tokens, totalTokens, cost, settings);
    }

    console.log('Showing notification:', notificationTitle, notificationBody);

    // Load the Clauwd notification icon
    const iconPath = path.join(__dirname, '../assets/notification-icon.png');
    const icon = nativeImage.createFromPath(iconPath);

    // Show system notification with time-sensitive priority to bypass Focus mode
    const notification = new Notification({
      title: notificationTitle,
      body: notificationBody,
      icon: !icon.isEmpty() ? icon : undefined,
      silent: !settings.soundEnabled,
      sound: settings.soundEnabled ? this.getSoundPath(settings.soundFile) : undefined,
      urgency: 'critical', // High priority for banner display
      timeoutType: 'default',
      // @ts-ignore - interruptionLevel is available but not in types
      interruptionLevel: 'time-sensitive' // Bypass Focus mode like Slack
    });

    notification.show();

    console.log('Notification shown');
  }

  private buildNotificationBody(
    entry: UsageEntry,
    tokens: { input_tokens: number; output_tokens: number; cache_creation_tokens: number; cache_read_tokens: number },
    totalTokens: number,
    cost: number,
    settings: Settings
  ): string {
    const bodySettings = settings.notificationBody;
    const parts: string[] = [];
    const line1Parts: string[] = [];
    const line2Parts: string[] = [];

    // Line 1: Session ID
    if (bodySettings.showSessionId && entry.sessionId) {
      const sessionIdShort = entry.sessionId.substring(0, 8);
      line1Parts.push(`Session: ${sessionIdShort}`);
    }

    // Line 1: Stop reason
    if (bodySettings.showStopReason && entry.stop_reason) {
      line1Parts.push(`Stopped: ${entry.stop_reason}`);
    }

    // Add line 1 if we have anything
    if (line1Parts.length > 0) {
      parts.push(line1Parts.join(' | '));
    }

    // Line 2: Tokens
    if (bodySettings.showTotalTokens) {
      let tokenStr = `${totalTokens.toLocaleString()} tokens`;

      // Add breakdown if requested
      if (bodySettings.showTokenBreakdown) {
        tokenStr += ` (${tokens.input_tokens.toLocaleString()}→${tokens.output_tokens.toLocaleString()})`;
      }

      line2Parts.push(tokenStr);
    }

    // Line 2: Cost
    if (bodySettings.showCost) {
      line2Parts.push(`$${cost.toFixed(4)}`);
    }

    // Line 2: Timestamp
    if (bodySettings.showTimestamp) {
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      line2Parts.push(timestamp);
    }

    // Add line 2 if we have anything
    if (line2Parts.length > 0) {
      parts.push(line2Parts.join(' | '));
    }

    // Line 3: Cache stats (if available and requested)
    if (bodySettings.showCacheStats && (tokens.cache_creation_tokens > 0 || tokens.cache_read_tokens > 0)) {
      const cacheStats: string[] = [];
      if (tokens.cache_read_tokens > 0) {
        cacheStats.push(`${(tokens.cache_read_tokens / 1000).toFixed(1)}K read`);
      }
      if (tokens.cache_creation_tokens > 0) {
        cacheStats.push(`${(tokens.cache_creation_tokens / 1000).toFixed(1)}K created`);
      }
      parts.push(`💾 Cache: ${cacheStats.join(', ')}`);
    }

    // Line 4: Response preview (if requested and available)
    if (bodySettings.showResponsePreview && entry.responseText) {
      const previewLength = bodySettings.previewLength || 100;
      let preview = entry.responseText.trim();

      // Take first line or up to preview length
      const firstLineEnd = preview.indexOf('\n');
      if (firstLineEnd > 0 && firstLineEnd < previewLength) {
        preview = preview.substring(0, firstLineEnd);
      } else if (preview.length > previewLength) {
        preview = preview.substring(0, previewLength) + '...';
      }

      parts.push(`"${preview}"`);
    }

    return parts.join('\n');
  }

  private getSoundPath(soundFile: string): string {
    // macOS system sounds
    const systemSounds: { [key: string]: string } = {
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

    return systemSounds[soundFile] || systemSounds['glass'];
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

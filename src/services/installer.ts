// ABOUTME: Service for installing and managing Claude Code hooks configuration
// ABOUTME: Handles hooks installation, backup, restoration, and login item settings
import * as fs from 'fs';
import * as path from 'path';
import { app, dialog, shell } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class InstallerService {
  private settingsPath: string;
  private settingsBackupPath: string;

  constructor() {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    this.settingsPath = path.join(home, '.claude', 'settings.json');
    this.settingsBackupPath = this.settingsPath + '.backup';
  }

  async checkHooksInstalled(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.settingsPath)) {
        return false;
      }

      const content = fs.readFileSync(this.settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      // Check if our specific menu bar app hooks are present by looking for the curl command to localhost
      // We check if any hook contains a curl command to localhost with our hook endpoint
      const hasMenuBarHook = (hookArray: any[] | undefined): boolean => {
        if (!hookArray) return false;
        return hookArray.some(hookItem =>
          hookItem.hooks?.some((hook: any) =>
            hook.command?.includes('localhost') && hook.command?.includes('/hook')
          )
        );
      };

      return !!(
        hasMenuBarHook(settings.hooks?.Stop) ||
        hasMenuBarHook(settings.hooks?.SubagentStop) ||
        hasMenuBarHook(settings.hooks?.PostToolUse)
      );
    } catch (error) {
      console.error('Error checking hooks:', error);
      return false;
    }
  }

  async installHooks(port: number = 3456): Promise<{ success: boolean; message: string }> {
    try {
      // Backup existing settings if they exist
      if (fs.existsSync(this.settingsPath)) {
        fs.copyFileSync(this.settingsPath, this.settingsBackupPath);
      }

      // Read existing settings
      let settings: any = {};
      if (fs.existsSync(this.settingsPath)) {
        const content = fs.readFileSync(this.settingsPath, 'utf-8');
        settings = JSON.parse(content);
      }

      // Initialize hooks object if it doesn't exist
      if (!settings.hooks) {
        settings.hooks = {};
      }

      // Helper function to add/update menu bar hook for a specific event
      const addMenuBarHook = (eventName: string, matcher: string, hookCommand: string) => {
        if (!settings.hooks[eventName]) {
          settings.hooks[eventName] = [];
        }

        // Find existing menu bar hook entry (matcher: '*' or specific matcher)
        const existingEntry = settings.hooks[eventName].find((entry: any) =>
          entry.matcher === matcher
        );

        const newHook = {
          type: 'command',
          command: hookCommand
        };

        if (existingEntry) {
          // Check if our hook already exists
          const hasOurHook = existingEntry.hooks?.some((hook: any) =>
            hook.command?.includes('localhost') && hook.command?.includes('/hook')
          );

          if (!hasOurHook) {
            // Add our hook to existing hooks array
            if (!existingEntry.hooks) {
              existingEntry.hooks = [];
            }
            existingEntry.hooks.push(newHook);
          } else {
            // Update existing menu bar hook with new port
            const hookIndex = existingEntry.hooks.findIndex((hook: any) =>
              hook.command?.includes('localhost') && hook.command?.includes('/hook')
            );
            if (hookIndex >= 0) {
              existingEntry.hooks[hookIndex] = newHook;
            }
          }
        } else {
          // Add new entry with our hook
          settings.hooks[eventName].push({
            matcher,
            hooks: [newHook]
          });
        }
      };

      // Add/update menu bar hooks for each event type
      addMenuBarHook('Stop', '*',
        `curl -s -X POST http://localhost:${port}/hook -H 'Content-Type: application/json' -d '{"event":"Stop"}' >> /tmp/claudecode-hooks.log 2>&1 &`
      );

      addMenuBarHook('SubagentStop', '*',
        `curl -s -X POST http://localhost:${port}/hook -H 'Content-Type: application/json' -d '{"event":"SubagentStop"}' >> /tmp/claudecode-hooks.log 2>&1 &`
      );

      addMenuBarHook('PostToolUse', 'Bash',
        `curl -s -X POST http://localhost:${port}/hook -H 'Content-Type: application/json' -d '{"event":"PostToolUse","tool":"Bash"}' >> /tmp/claudecode-hooks.log 2>&1 &`
      );

      // Write updated settings
      fs.writeFileSync(
        this.settingsPath,
        JSON.stringify(settings, null, 2),
        'utf-8'
      );

      return {
        success: true,
        message: 'Hooks installed successfully! They are now active.'
      };
    } catch (error) {
      console.error('Error installing hooks:', error);
      return {
        success: false,
        message: `Failed to install hooks: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async openHooksConfig(): Promise<void> {
    if (fs.existsSync(this.settingsPath)) {
      await shell.openPath(this.settingsPath);
    } else {
      dialog.showMessageBox({
        type: 'info',
        title: 'Hooks Not Installed',
        message: 'Claude Code hooks are not installed yet.',
        detail: 'Would you like to install them now?',
        buttons: ['Install', 'Cancel']
      }).then(result => {
        if (result.response === 0) {
          // User clicked Install
          this.installHooks();
        }
      });
    }
  }

  async restoreHooksBackup(): Promise<{ success: boolean; message: string }> {
    try {
      if (!fs.existsSync(this.settingsBackupPath)) {
        return {
          success: false,
          message: 'No backup file found'
        };
      }

      fs.copyFileSync(this.settingsBackupPath, this.settingsPath);

      return {
        success: true,
        message: 'Settings backup restored successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to restore backup: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  getLoginItemSettings(): boolean {
    return app.getLoginItemSettings().openAtLogin;
  }

  setLoginItemSettings(openAtLogin: boolean): void {
    app.setLoginItemSettings({
      openAtLogin,
      openAsHidden: false
    });
  }
}

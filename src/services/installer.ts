// ABOUTME: Service for installing and managing Claude Code hooks configuration
// ABOUTME: Handles hooks installation, backup, restoration, and login item settings
import * as fs from 'fs';
import * as path from 'path';
import { app, dialog, shell } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class InstallerService {
  private hooksConfigPath: string;
  private hooksBackupPath: string;

  constructor() {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    this.hooksConfigPath = path.join(home, '.config', 'claude-code', 'hooks.json');
    this.hooksBackupPath = this.hooksConfigPath + '.backup';
  }

  async checkHooksInstalled(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.hooksConfigPath)) {
        return false;
      }

      const content = fs.readFileSync(this.hooksConfigPath, 'utf-8');
      const hooks = JSON.parse(content);

      // Check if our hooks are present
      return !!(
        hooks.hooks?.Stop ||
        hooks.hooks?.SubagentStop ||
        hooks.hooks?.PostToolUse
      );
    } catch (error) {
      console.error('Error checking hooks:', error);
      return false;
    }
  }

  async installHooks(port: number = 3456): Promise<{ success: boolean; message: string }> {
    try {
      // Ensure config directory exists
      const configDir = path.dirname(this.hooksConfigPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Backup existing hooks if they exist
      if (fs.existsSync(this.hooksConfigPath)) {
        fs.copyFileSync(this.hooksConfigPath, this.hooksBackupPath);
      }

      // Create hooks configuration
      const hooksConfig = {
        hooks: {
          Stop: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: `curl -s -X POST http://localhost:${port}/hook -H 'Content-Type: application/json' -d '{"event":"Stop","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > /dev/null 2>&1 &`
                }
              ]
            }
          ],
          SubagentStop: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: `curl -s -X POST http://localhost:${port}/hook -H 'Content-Type: application/json' -d '{"event":"SubagentStop","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > /dev/null 2>&1 &`
                }
              ]
            }
          ],
          PostToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                {
                  type: 'command',
                  command: `curl -s -X POST http://localhost:${port}/hook -H 'Content-Type: application/json' -d '{"event":"PostToolUse","tool":"Bash","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > /dev/null 2>&1 &`
                }
              ]
            },
            {
              matcher: 'Task',
              hooks: [
                {
                  type: 'command',
                  command: `curl -s -X POST http://localhost:${port}/hook -H 'Content-Type: application/json' -d '{"event":"PostToolUse","tool":"Task","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > /dev/null 2>&1 &`
                }
              ]
            }
          ]
        }
      };

      // Write hooks configuration
      fs.writeFileSync(
        this.hooksConfigPath,
        JSON.stringify(hooksConfig, null, 2),
        'utf-8'
      );

      return {
        success: true,
        message: 'Hooks installed successfully! Restart Claude Code for changes to take effect.'
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
    if (fs.existsSync(this.hooksConfigPath)) {
      await shell.openPath(this.hooksConfigPath);
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
      if (!fs.existsSync(this.hooksBackupPath)) {
        return {
          success: false,
          message: 'No backup file found'
        };
      }

      fs.copyFileSync(this.hooksBackupPath, this.hooksConfigPath);

      return {
        success: true,
        message: 'Hooks backup restored successfully'
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

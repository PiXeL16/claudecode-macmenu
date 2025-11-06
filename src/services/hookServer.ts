import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface HookMessage {
  event: 'Stop' | 'SubagentStop' | 'SessionStart' | 'SessionEnd' | 'PostToolUse';
  sessionId?: string;
  timestamp: string;
  data?: any;
}

export class HookServer {
  private server: net.Server | null = null;
  private socketPath: string;
  private onMessageCallback?: (message: HookMessage) => void;

  constructor() {
    // Use a socket file for IPC
    const tmpDir = os.tmpdir();
    this.socketPath = path.join(tmpDir, 'claudecode-macmenu.sock');
  }

  start(onMessage: (message: HookMessage) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      this.onMessageCallback = onMessage;

      // Remove existing socket file if it exists
      if (fs.existsSync(this.socketPath)) {
        fs.unlinkSync(this.socketPath);
      }

      this.server = net.createServer((socket) => {
        let buffer = '';

        socket.on('data', (data) => {
          buffer += data.toString();

          // Check if we have a complete message (ended with newline)
          const lines = buffer.split('\n');

          // Process all complete lines
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();
            if (line) {
              try {
                const message = JSON.parse(line) as HookMessage;
                this.handleMessage(message);
              } catch (error) {
                console.error('Failed to parse hook message:', error);
              }
            }
          }

          // Keep the incomplete line in the buffer
          buffer = lines[lines.length - 1];
        });

        socket.on('end', () => {
          // Process any remaining data
          if (buffer.trim()) {
            try {
              const message = JSON.parse(buffer) as HookMessage;
              this.handleMessage(message);
            } catch (error) {
              console.error('Failed to parse final hook message:', error);
            }
          }
        });

        socket.on('error', (err) => {
          console.error('Socket error:', err);
        });
      });

      this.server.on('error', (err) => {
        console.error('Hook server error:', err);
        reject(err);
      });

      this.server.listen(this.socketPath, () => {
        console.log(`Hook server listening on ${this.socketPath}`);

        // Make socket writable by all (so hooks can write to it)
        try {
          fs.chmodSync(this.socketPath, 0o666);
        } catch (error) {
          console.error('Failed to chmod socket:', error);
        }

        resolve();
      });
    });
  }

  private handleMessage(message: HookMessage): void {
    console.log('Received hook message:', message);

    if (this.onMessageCallback) {
      this.onMessageCallback(message);
    }
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }

    // Clean up socket file
    if (fs.existsSync(this.socketPath)) {
      fs.unlinkSync(this.socketPath);
    }
  }

  getSocketPath(): string {
    return this.socketPath;
  }
}

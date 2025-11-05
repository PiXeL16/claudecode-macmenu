// ABOUTME: HTTP server that receives hook events from Claude Code and triggers notifications
// ABOUTME: Listens on localhost for POST requests containing event data from Claude Code hooks
import * as http from 'http';
import { NotificationService } from './notification';

export interface HookEvent {
  event: 'Stop' | 'SubagentStop' | 'PostToolUse' | 'PreToolUse' | 'UserPromptSubmit';
  tool?: string;
  context?: string;
  timestamp?: string;
}

export class HookServer {
  private server: http.Server | null = null;
  private port: number;

  constructor(
    private notificationService: NotificationService,
    port: number = 3456
  ) {
    this.port = port;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          console.log(`Port ${this.port} is in use, trying ${this.port + 1}`);
          this.port++;
          this.start().then(resolve).catch(reject);
        } else {
          reject(error);
        }
      });

      this.server.listen(this.port, 'localhost', () => {
        console.log(`Hook server listening on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  getPort(): number {
    return this.port;
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Only accept POST requests
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    // Only accept requests to /hook endpoint
    if (req.url !== '/hook') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    // Read request body
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const event: HookEvent = JSON.parse(body);
        this.processHookEvent(event);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('Failed to process hook event:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
  }

  private processHookEvent(event: HookEvent): void {
    console.log('Received hook event:', event);

    switch (event.event) {
      case 'Stop':
        this.notificationService.notifyTaskComplete(
          'Claude Code finished responding'
        );
        break;

      case 'SubagentStop':
        this.notificationService.notifyTaskComplete(
          'Claude Code task completed'
        );
        break;

      case 'PostToolUse':
        if (event.tool) {
          this.handleToolComplete(event.tool, event.context);
        }
        break;

      case 'UserPromptSubmit':
        // Optional: notify when user submits a prompt
        // this.notificationService.notifyTaskComplete('New task started');
        break;

      default:
        console.log('Unhandled event type:', event.event);
    }
  }

  private handleToolComplete(tool: string, context?: string): void {
    const notifiableTools = ['Bash', 'Task', 'Build', 'Test'];

    if (notifiableTools.includes(tool)) {
      let message = `${tool} completed`;
      if (context) {
        // Truncate context if too long
        const shortContext = context.length > 50
          ? context.substring(0, 47) + '...'
          : context;
        message += `: ${shortContext}`;
      }

      this.notificationService.notifyTaskComplete(message);
    }
  }
}

// ABOUTME: Unit tests for the hook server that receives events from Claude Code
// ABOUTME: Tests HTTP server functionality, request handling, and event processing

import * as http from 'http';
import { HookServer, HookEvent } from '../hookServer';
import { NotificationService } from '../notification';

// Mock the NotificationService
jest.mock('../notification');

describe('HookServer', () => {
  let hookServer: HookServer;
  let mockNotificationService: jest.Mocked<NotificationService>;

  beforeEach(() => {
    mockNotificationService = {
      notifyTaskComplete: jest.fn()
    } as any;

    hookServer = new HookServer(mockNotificationService, 3457); // Use non-standard port for tests
  });

  afterEach(async () => {
    hookServer.stop();
  });

  describe('start', () => {
    it('should start server on specified port', async () => {
      await hookServer.start();
      expect(hookServer.getPort()).toBe(3457);
    });

    it('should increment port if already in use', async () => {
      // Start first server
      const firstServer = new HookServer(mockNotificationService, 3458);
      await firstServer.start();

      // Start second server on same port - should auto-increment
      const secondServer = new HookServer(mockNotificationService, 3458);
      await secondServer.start();

      expect(secondServer.getPort()).toBeGreaterThan(3458);

      firstServer.stop();
      secondServer.stop();
    });
  });

  describe('getPort', () => {
    it('should return the configured port', () => {
      expect(hookServer.getPort()).toBe(3457);
    });
  });

  describe('stop', () => {
    it('should stop the server', async () => {
      await hookServer.start();
      hookServer.stop();

      // Try to make a request - should fail
      const makeRequest = () => {
        return new Promise((resolve, reject) => {
          const req = http.request({
            hostname: 'localhost',
            port: 3457,
            path: '/hook',
            method: 'POST'
          }, resolve);
          req.on('error', reject);
          req.end();
        });
      };

      await expect(makeRequest()).rejects.toThrow();
    });
  });

  describe('handleRequest', () => {
    beforeEach(async () => {
      await hookServer.start();
    });

    const makeRequest = (method: string, path: string, body?: any): Promise<{ statusCode: number; data: string }> => {
      return new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: hookServer.getPort(),
          path: path,
          method: method,
          headers: {
            'Content-Type': 'application/json'
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({ statusCode: res.statusCode || 0, data });
          });
        });

        req.on('error', reject);

        if (body) {
          req.write(JSON.stringify(body));
        }
        req.end();
      });
    };

    it('should reject non-POST requests', async () => {
      const response = await makeRequest('GET', '/hook');
      expect(response.statusCode).toBe(405);
      expect(JSON.parse(response.data).error).toBe('Method not allowed');
    });

    it('should reject requests to wrong path', async () => {
      const response = await makeRequest('POST', '/wrong-path');
      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.data).error).toBe('Not found');
    });

    it('should accept valid Stop event', async () => {
      const event: HookEvent = {
        event: 'Stop',
        timestamp: '2025-11-05T10:00:00Z'
      };

      const response = await makeRequest('POST', '/hook', event);
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.data).success).toBe(true);
      expect(mockNotificationService.notifyTaskComplete).toHaveBeenCalledWith(
        'Claude Code finished responding'
      );
    });

    it('should accept valid SubagentStop event', async () => {
      const event: HookEvent = {
        event: 'SubagentStop',
        timestamp: '2025-11-05T10:00:00Z'
      };

      const response = await makeRequest('POST', '/hook', event);
      expect(response.statusCode).toBe(200);
      expect(mockNotificationService.notifyTaskComplete).toHaveBeenCalledWith(
        'Claude Code task completed'
      );
    });

    it('should accept valid PostToolUse event for Bash', async () => {
      const event: HookEvent = {
        event: 'PostToolUse',
        tool: 'Bash',
        timestamp: '2025-11-05T10:00:00Z'
      };

      const response = await makeRequest('POST', '/hook', event);
      expect(response.statusCode).toBe(200);
      expect(mockNotificationService.notifyTaskComplete).toHaveBeenCalledWith(
        'Bash completed'
      );
    });

    it('should accept valid PostToolUse event for Task with context', async () => {
      const event: HookEvent = {
        event: 'PostToolUse',
        tool: 'Task',
        context: 'Running analysis on codebase structure and dependencies',
        timestamp: '2025-11-05T10:00:00Z'
      };

      const response = await makeRequest('POST', '/hook', event);
      expect(response.statusCode).toBe(200);
      // Context should be truncated to 50 chars
      expect(mockNotificationService.notifyTaskComplete).toHaveBeenCalledWith(
        expect.stringContaining('Task completed: Running analysis on codebase')
      );
      const lastCall = mockNotificationService.notifyTaskComplete.mock.calls[0]?.[0];
      expect(lastCall).toMatch(/\.\.\./); // Should contain ellipsis
    });

    it('should not notify for non-notifiable tools', async () => {
      const event: HookEvent = {
        event: 'PostToolUse',
        tool: 'Read',
        timestamp: '2025-11-05T10:00:00Z'
      };

      const response = await makeRequest('POST', '/hook', event);
      expect(response.statusCode).toBe(200);
      expect(mockNotificationService.notifyTaskComplete).not.toHaveBeenCalled();
    });

    it('should handle UserPromptSubmit event without notification', async () => {
      const event: HookEvent = {
        event: 'UserPromptSubmit',
        timestamp: '2025-11-05T10:00:00Z'
      };

      const response = await makeRequest('POST', '/hook', event);
      expect(response.statusCode).toBe(200);
      expect(mockNotificationService.notifyTaskComplete).not.toHaveBeenCalled();
    });

    it('should reject invalid JSON', async () => {
      const makeInvalidRequest = (): Promise<{ statusCode: number; data: string }> => {
        return new Promise((resolve, reject) => {
          const req = http.request({
            hostname: 'localhost',
            port: hookServer.getPort(),
            path: '/hook',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              resolve({ statusCode: res.statusCode || 0, data });
            });
          });

          req.on('error', reject);
          req.write('invalid json{');
          req.end();
        });
      };

      const response = await makeInvalidRequest();
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.data).error).toBe('Invalid request');
    });

    it('should truncate long context strings', async () => {
      const longContext = 'a'.repeat(100);
      const event: HookEvent = {
        event: 'PostToolUse',
        tool: 'Bash',
        context: longContext,
        timestamp: '2025-11-05T10:00:00Z'
      };

      const response = await makeRequest('POST', '/hook', event);
      expect(response.statusCode).toBe(200);

      const lastCall = mockNotificationService.notifyTaskComplete.mock.calls[0]?.[0];
      expect(lastCall).toBeDefined();
      // "Bash completed: " (16 chars) + truncated context (up to 50 chars) + "..." (3 chars)
      expect(lastCall!.length).toBeLessThanOrEqual(70);
      expect(lastCall).toContain('...');
      // Verify it's shorter than the full message would be
      expect(lastCall!.length).toBeLessThan(`Bash completed: ${longContext}`.length);
    });
  });
});
